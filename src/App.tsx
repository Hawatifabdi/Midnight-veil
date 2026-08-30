import React, { useState } from 'react';
import { scrubMedicalPrompt, ScrubResult } from './sanitizer/phiScrubber';
import { midnightClient, MidnightProofSubmission } from './lib/midnightService';
import { analyzeClinicalPayload, ClinicalAnalysis } from './lib/llmService';
import { ShieldCheck, Lock, CheckCircle2, FileText, Loader2, ArrowRight, Wallet, ExternalLink, AlertCircle, Stethoscope, Sparkles } from 'lucide-react';

const PRESETS = [
  {
    label: 'Neurology (Migraine / Dizziness)',
    text: 'Demo patient presents with severe persistent migraines and acute dizziness.',
  },
  {
    label: 'Cardiology (ER Chest Pain)',
    text: 'Demo patient reports acute substernal chest pressure radiating to the left arm upon exertion.',
  },
  {
    label: 'Pediatric Intake',
    text: 'Demo pediatric patient presents with persistent fever, dry cough, and mild tachypnea.',
  },
];

export default function App() {
  const [inputText, setInputText] = useState(PRESETS[0].text);
  const [result, setResult] = useState<ScrubResult | null>(null);
  const [isProving, setIsProving] = useState(false);
  const [proofRecord, setProofRecord] = useState<MidnightProofSubmission | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<ClinicalAnalysis | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletStatusMsg, setWalletStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleConnectWallet = async () => {
    setWalletStatusMsg(null);
    const res = await midnightClient.connectWallet();
    if (res.success && res.connection) {
      setWalletAddress(res.connection.address);
      setWalletStatusMsg(`${res.connection.walletName} connected to ${res.connection.networkId}.`);
    } else {
      setWalletStatusMsg(res.error || 'Lace Wallet extension not found.');
    }
  };

  const handleProcess = async () => {
    try {
      setErrorMsg(null);
      setIsProving(true);
      setAiAnalysis(null);

      // 1. Local Sanitization Pass
      const scrubbed = await scrubMedicalPrompt(inputText);
      setResult(scrubbed);

      // 2. Midnight Compact Proof Execution
      const record = await midnightClient.executeVerifyAndLogIntake(scrubbed);
      setProofRecord(record);

      // 3. Send Sanitized Payload to LLM Layer
      const analysis = await analyzeClinicalPayload(scrubbed.cleanText);
      setAiAnalysis(analysis);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error executing Compact circuit.');
    } finally {
      setIsProving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Midnight Veil</h1>
              <p className="text-xs text-slate-500">Zero-Knowledge HIPAA Compliance on Midnight Network</p>
            </div>
          </div>
          <button
            onClick={handleConnectWallet}
            className={`text-xs px-3 py-1.5 rounded-md font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
              walletAddress
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            {walletAddress ? `${walletAddress.slice(0, 10)}...` : 'Connect Lace Wallet'}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {walletStatusMsg && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>{walletStatusMsg}</span>
            </div>
            <button onClick={() => setWalletStatusMsg(null)} className="text-amber-900 font-bold ml-4 text-sm hover:opacity-75">
              ×
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs">
            {errorMsg}
          </div>
        )}

        {/* Clinical Presets Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-500 font-medium whitespace-nowrap">Load Preset:</span>
          {PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => setInputText(preset.text)}
              className="px-3 py-1 bg-white border border-slate-200 hover:border-blue-300 text-slate-700 rounded-md whitespace-nowrap transition-colors shadow-sm"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Input / Sanitizer Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Panel */}
          <section className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-slate-900">
                <FileText className="w-4 h-4 text-blue-600" />
                1. Local Patient Intake (Raw PHI)
              </h2>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                Private Witness
              </span>
            </div>

            <textarea
              className="w-full h-36 bg-slate-50 border border-slate-300 rounded-md p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter raw clinical prompt..."
            />

            <button
              onClick={handleProcess}
              disabled={isProving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-md text-xs transition-colors flex items-center justify-center gap-2 disabled:bg-blue-400 cursor-pointer disabled:cursor-not-allowed shadow-sm"
            >
              {isProving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Compact Proof & Triage...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Sanitize, Prove & Analyze
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </section>

          {/* Right Panel */}
          <section className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4 flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-slate-900">
                <Lock className="w-4 h-4 text-blue-600" />
                2. De-Identified Payload (Safe for LLM)
              </h2>
              <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-medium">
                HIPAA Sanitized
              </span>
            </div>

            <div className="flex-1 min-h-[144px] bg-slate-50 border border-slate-200 rounded-md p-3 text-xs text-slate-700 font-mono overflow-y-auto leading-relaxed">
              {result ? result.cleanText : <span className="text-slate-400 italic">Sanitized prompt output will render here...</span>}
            </div>

            {result && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                <span className="text-slate-600">
                  Identifiers Scrubbed: <strong className="text-slate-900">{result.detectedPhiCount}</strong>
                </span>
                <span className="text-emerald-700 font-medium">
                  Residual PHI: {result.residualPhiCount} (Verified Safe)
                </span>
              </div>
            )}
          </section>
        </div>

        {/* Midnight On-Chain Ledger Verification Card */}
        {proofRecord && (
          <section className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Local Circuit Validation (<code className="text-blue-600 font-mono">veil.compact</code>)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {proofRecord.submitted ? `Block #${proofRecord.blockHeight}` : 'Not submitted on-chain'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs bg-slate-50 p-4 rounded-md border border-slate-200 font-mono">
              <div>
                <span className="text-slate-500 block text-[11px] uppercase">latest_session_id</span>
                <span className="text-slate-800 font-medium truncate block" title={proofRecord.sessionId}>
                  {proofRecord.sessionId}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] uppercase">compliance_status</span>
                <span className="text-emerald-700 font-bold block">
                  {proofRecord.complianceStatus ? 'true (VERIFIED)' : 'false'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] uppercase">clean_text_hash</span>
                <span className="text-slate-800 font-medium truncate block" title={proofRecord.cleanTextHash}>
                  {proofRecord.cleanTextHash}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] uppercase">{proofRecord.submitted ? 'Tx Hash' : 'Validation ID'}</span>
                <span className="text-blue-600 font-medium truncate block flex items-center gap-1" title={proofRecord.txHash}>
                  {proofRecord.txHash.slice(0, 14)}...
                  <ExternalLink className="w-3 h-3 flex-shrink-0 inline" />
                </span>
              </div>
            </div>
          </section>
        )}

        {/* AI Clinical Diagnostic Insights Panel */}
        {aiAnalysis && (
          <section className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-slate-900">
                3. AI Clinical Triage & Differential Considerations
              </h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-md border border-slate-200 text-slate-700 leading-relaxed">
                <strong className="text-slate-900 block mb-1">Clinical Summary:</strong>
                {aiAnalysis.summary}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-md">
                  <span className="font-semibold text-blue-900 block mb-2 flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                    Differential Diagnoses to Evaluate
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-slate-700">
                    {aiAnalysis.potentialDifferentials.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-md">
                  <span className="font-semibold text-emerald-900 block mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Recommended Clinical Workup
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-slate-700">
                    {aiAnalysis.recommendedWorkup.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
