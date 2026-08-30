import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import { ScrubResult } from '../sanitizer/phiScrubber';

const networkId = import.meta.env.VITE_MIDNIGHT_NETWORK_ID || 'testnet';

export interface MidnightProofSubmission {
  txHash: string;
  blockHeight: number;
  sessionId: string;
  cleanTextHash: string;
  complianceStatus: boolean;
  walletAddress?: string;
  submitted: boolean;
}

export interface WalletConnection {
  address: string;
  walletName: string;
  networkId: string;
}

function hexToBytes32(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const padded = cleanHex.padEnd(64, '0').slice(0, 64);
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = Number.parseInt(padded.slice(i * 2, i * 2 + 2), 16) || 0;
  }
  return bytes;
}

function findLaceWallet(wallets: Record<string, InitialAPI>): InitialAPI | undefined {
  return Object.values(wallets).find((wallet) => /lace/i.test(`${wallet.name} ${wallet.rdns}`));
}

export class MidnightVeilClient {
  private connectedApi: ConnectedAPI | null = null;
  private activeAddress: string | null = null;

  async connectWallet(): Promise<{ success: boolean; connection?: WalletConnection; error?: string }> {
    if (typeof window === 'undefined') {
      return { success: false, error: 'Wallet connections require a browser.' };
    }

    const wallets = window.midnight;
    if (!wallets || Object.keys(wallets).length === 0) {
      return {
        success: false,
        error: 'No Midnight wallet was found. Install and unlock the Midnight-compatible Lace extension, then refresh this page.',
      };
    }

    const laceWallet = findLaceWallet(wallets);
    if (!laceWallet) {
      const walletNames = Object.values(wallets).map((wallet) => wallet.name).join(', ');
      return { success: false, error: `A Midnight wallet is available (${walletNames}), but Midnight Lace was not found.` };
    }

    try {
      // Midnight's connector uses connect(networkId), not the Cardano CIP-30 enable() API.
      const connectedApi = await laceWallet.connect(networkId);
      const status = await connectedApi.getConnectionStatus();
      if (status.status !== 'connected') {
        return { success: false, error: 'Lace did not establish a Midnight network connection.' };
      }

      const addresses = await connectedApi.getShieldedAddresses();
      if (!addresses.shieldedAddress) {
        return { success: false, error: 'Lace connected but did not return a shielded Midnight address.' };
      }

      this.connectedApi = connectedApi;
      this.activeAddress = addresses.shieldedAddress;
      return {
        success: true,
        connection: { address: addresses.shieldedAddress, walletName: laceWallet.name, networkId: status.networkId },
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: `Could not connect to Midnight Lace on ${networkId}: ${message || 'the request was rejected.'}` };
    }
  }

  isWalletConnected(): boolean {
    return this.connectedApi !== null;
  }

  /** Validates circuit constraints locally; this does not submit a fabricated transaction. */
  async executeVerifyAndLogIntake(scrubResult: ScrubResult): Promise<MidnightProofSubmission> {
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    const sessionIdHex = `0x${Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
    const auditWitness = {
      raw_hash: hexToBytes32(scrubResult.rawHash),
      clean_hash: hexToBytes32(scrubResult.cleanHash),
      phi_detected_count: scrubResult.detectedPhiCount,
      residual_phi_count: scrubResult.residualPhiCount,
    };

    if (auditWitness.residual_phi_count !== 0) {
      throw new Error('Circuit constraint violation: residual PHI tokens were detected.');
    }
    if (auditWitness.raw_hash.toString() === auditWitness.clean_hash.toString() && auditWitness.phi_detected_count > 0) {
      throw new Error('Circuit constraint violation: sanitization did not change the input.');
    }

    return {
      txHash: `local-${sessionIdHex.slice(2, 18)}`,
      blockHeight: 0,
      sessionId: sessionIdHex,
      cleanTextHash: scrubResult.cleanHash,
      complianceStatus: true,
      walletAddress: this.activeAddress || undefined,
      submitted: false,
    };
  }
}

export const midnightClient = new MidnightVeilClient();
