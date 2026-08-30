# Midnight Veil

**Zero-Knowledge HIPAA Compliance and PHI Sanitization Engine for Clinical AI Prompts on the Midnight Network.**

---

## Overview

Midnight Veil is a decentralized privacy layer built for the Midnight Hackathon. It enables healthcare providers, clinics, and clinical researchers to utilize third-party Large Language Models (LLMs) while reducing the privacy risks associated with transmitting sensitive clinical information.

By combining local client-side Protected Health Information (PHI) scrubbing with Zero-Knowledge (ZK) proofs written in Midnight's Compact smart contract language, Midnight Veil is designed to ensure that sensitive patient identifiers remain on the user's local machine while providing cryptographic verification that sanitization requirements were satisfied before model inference.

---

## Problem Statement

Hospitals and medical practitioners increasingly rely on generative AI for differential diagnoses, medical triage, and clinical summarization. However, sending raw patient notes to third-party AI APIs presents significant legal and privacy risks:

* **HIPAA Violations and Data Leaks:** Direct ingestion of clinical notes containing patient names, Social Security Numbers, dates of birth, and medical record numbers (MRNs) creates significant privacy and compliance risks.
* **Audit Verification Paradox:** Traditional compliance logging requires recording data transmissions. Storing raw or redacted notes on a public ledger exposes sensitive patient context, while keeping logs entirely off-chain provides no tamper-proof guarantee that sanitization occurred.
* **Lack of Cryptographic Guarantees:** Third-party auditors cannot verify whether an AI prompt was properly stripped of PHI without viewing the original sensitive text.

---

## How Midnight Solves the Problem

Midnight Veil leverages Midnight's privacy-preserving blockchain and zero-knowledge smart contract architecture to address the audit paradox:

* **Local Data Processing:** Raw clinical intake is processed within the user's local browser environment before any external AI request is made.
* **Verifiable Sanitization via Compact:** A zero-knowledge circuit written in `veil.compact` enforces sanitization constraints.
* **Zero Residual PHI Requirement:** The verification circuit requires the reported residual PHI token count to equal zero (`residual_phi_count == 0`).
* **Hash-Based Verification:** When PHI is detected, the circuit verifies that the raw prompt hash differs from the sanitized prompt hash.
* **On-Chain Compliance Receipt:** Midnight records a compliance state containing information such as the session identifier, sanitized text hash, and verification status without storing the raw clinical text.

---

## System Architecture and Workflow

```text
                    ┌──────────────────────────────┐
                    │    Raw Clinical Intake       │
                    │          (PHI)               │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │    Local Browser Engine      │
                    │ Regex & Pattern Redaction    │
                    └──────────────┬───────────────┘
                                   │
                         Sanitized Prompt
                                   │
                    ┌──────────────┴───────────────┐
                    │                              │
                    ▼                              ▼
        ┌─────────────────────┐       ┌────────────────────────┐
        │  Private Witness    │       │   Safe Payload         │
        │  Construction       │       │                        │
        └──────────┬──────────┘       └────────────┬───────────┘
                   │                               │
                   ▼                               ▼
        ┌─────────────────────┐       ┌────────────────────────┐
        │  veil.compact       │       │ OpenRouter / OpenAI    │
        │  ZK Circuit         │       │ API                    │
        └──────────┬──────────┘       └────────────┬───────────┘
                   │                               │
                   ▼                               ▼
        ┌─────────────────────┐       ┌────────────────────────┐
        │ Midnight Testnet    │       │ Structured AI          │
        │ Ledger              │       │ Diagnostics             │
        │                     │       │                        │
        │ Verified = true     │       │ Differential Diagnosis │
        └─────────────────────┘       │ Workup Suggestions     │
                                      └────────────────────────┘
```

### Workflow

1. **Intake & Local Scrubbing**

   The practitioner enters clinical notes into the web dashboard. The local engine detects and scrubs names, dates, phone numbers, SSNs, and clinical identifiers.

2. **Private Witness Construction**

   The application constructs an `AuditWitness` containing the raw hash, clean hash, detected PHI token count, and residual PHI token count.

3. **Zero-Knowledge Verification**

   The Midnight Compact circuit verifies the required constraints using the private witness.

4. **Ledger State Update**

   After successful verification, the application updates the compliance state on the Midnight Testnet.

5. **AI Triage Inference**

   The de-identified prompt is transmitted to the LLM endpoint via OpenRouter to generate structured differential diagnoses and recommended workup steps.

---

## Smart Contract Details

### `contracts/veil.compact`

The smart contract uses Midnight's Compact language to maintain a verifiable compliance state.

### Ledger State

* `latest_session_id`: 32-byte identifier for the current compliance session.
* `clean_text_hash`: 32-byte cryptographic hash of the sanitized prompt.
* `compliance_status`: Boolean indicator confirming successful verification.
* `session_counter`: Unsigned counter tracking verified submissions.

### Circuit Witness Verification

The circuit consumes a private `AuditWitness` and enforces mathematical assertions.

The first requirement ensures that no residual PHI is reported after sanitization:

```text
assert(witness.residual_phi_count == 0)
```

When PHI has been detected, the circuit additionally verifies that the raw and sanitized prompt hashes differ:

```text
assert(
    witness.raw_hash != witness.clean_hash
)
```

This allows the system to verify sanitization-related conditions without placing the original clinical text on-chain.

---

## Deployment and Network Artifacts

**Target Network:** Midnight Testnet

**Smart Contract Language:** Compact

### Deployed Contract

```text
Contract Address:
0x157dfe82963c62034178547bb0384461e95c42577806274be69b3c426d451cb4
```

### Deployment Transaction

```text
Deployment Tx:
0xe553236612717ca4a62e721e9efc5edc524933b7f46de9a7d17515899d1504f3
```

### Initial Ledger State

```text
session_counter:   0
compliance_status: false
```

The contract was successfully deployed to the Midnight Testnet.

---

## Tech Stack

### Smart Contract

* Midnight Compact
* `@midnight-ntwrk/compact-compiler`

### Blockchain Integration

* `@midnight-ntwrk/midnight-js-contracts`
* `@midnight-ntwrk/dapp-connector-api`

### Wallet

* Midnight Lace Wallet
* tNIGHT / tDUST shielded transactions

### Frontend

* React
* TypeScript
* Tailwind CSS
* Vite
* Lucide Icons

### LLM Integration

* OpenRouter API
* OpenAI GPT-4o-mini

---

## Getting Started

### Prerequisites

Make sure you have:

* Node.js version 18 or higher
* npm or yarn
* Midnight Lace browser extension configured for Midnight Testnet

---

### Installation

#### 1. Clone the repository

```bash
git clone https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git
cd midnight-veil-app
```

#### 2. Install dependencies

```bash
npm install
```

#### 3. Configure environment variables

Create a `.env` file in the root directory:

```env
VITE_OPENROUTER_API_KEY="your-openrouter-api-key"
```

**Important:** Never commit your `.env` file or expose your API key publicly.

Add the following to `.gitignore` if it is not already present:

```text
.env
.env.local
```

#### 4. Compile the Compact contract

```bash
compact compile contracts/veil.compact contracts/build
```

#### 5. Deploy the contract

```bash
npm run contract:deploy
```

The contract should be deployed to the Midnight Testnet and the resulting contract address should be recorded in the deployment section of this README.

#### 6. Start the development server

```bash
npm run dev
```

#### 7. Open the application

Visit:

```text
http://localhost:5173
```

---

## Privacy Model

Midnight Veil follows a **privacy-by-design** architecture.

```text
┌─────────────────────────────────────────────────────┐
│                  PATIENT DATA                       │
│                                                     │
│        Raw clinical notes containing PHI            │
│                         │                           │
│                         ▼                           │
│              ┌──────────────────┐                   │
│              │ Local PHI Engine │                   │
│              └────────┬─────────┘                   │
│                       │                             │
│                 PHI Removed                         │
│                       │                             │
│              ┌────────▼─────────┐                   │
│              │ Sanitized Prompt │                   │
│              └────────┬─────────┘                   │
│                       │                             │
│              ┌────────▼─────────┐                   │
│              │ ZK Verification  │                   │
│              └────────┬─────────┘                   │
│                       │                             │
│              ┌────────▼─────────┐                   │
│              │ Midnight Ledger  │                   │
│              │ Compliance Proof │                   │
│              └──────────────────┘                   │
│                                                     │
│       Only the sanitized prompt reaches the LLM     │
└─────────────────────────────────────────────────────┘
```

The architecture is designed so that:

* Raw PHI remains within the local processing environment.
* PHI is removed before the external AI inference request.
* Raw clinical notes are not stored on the blockchain.
* Patient identities are not written to the public ledger.
* Sanitization-related conditions can be cryptographically verified.
* The blockchain stores verification-related state rather than the underlying clinical text.

---

## Security Considerations

Midnight Veil is a **hackathon prototype** and should **not be considered a production HIPAA compliance solution** without additional security, legal, and clinical validation.

Potential production requirements include:

* More robust PHI detection using NLP and entity-recognition models.
* Comprehensive testing against adversarial PHI inputs.
* Formal verification of the Compact circuits.
* Secure key management.
* API security and rate limiting.
* Strong authentication and authorization.
* Secure audit logging.
* Clinical validation.
* Legal and regulatory review.
* Business Associate Agreements (BAAs) where applicable.
* Secure infrastructure and production deployment practices.

---

## Project Goals

Midnight Veil demonstrates how zero-knowledge technology can create a new model for privacy-preserving AI in healthcare:

> **Prove that sensitive data was sanitized without revealing the sensitive data itself.**

Instead of requiring an auditor to trust an application's privacy claims, Midnight Veil introduces a cryptographically verifiable layer for demonstrating that predefined sanitization conditions were satisfied.

---

## Hackathon Context

Midnight Veil was built for the **Midnight Hackathon**, exploring how Midnight's privacy-preserving blockchain infrastructure can be applied to real-world problems involving sensitive data.

The project focuses on the intersection of:

* Zero-Knowledge Proofs
* Privacy-Preserving AI
* Healthcare Data Protection
* Blockchain
* Smart Contracts
* LLM Security
* Regulatory Compliance

---

## Future Improvements

Potential future development includes:

* ML-based PHI detection alongside deterministic pattern matching.
* Support for additional clinical identifiers.
* More sophisticated ZK circuits for sanitization verification.
* Multiple LLM providers.
* Encrypted local storage for temporary clinical sessions.
* Fine-grained audit permissions.
* Verifiable compliance reports for healthcare organizations.
* Integration with clinical workflows and electronic health record systems.
* Automated security and adversarial testing.

---

## Disclaimer

Midnight Veil is a hackathon prototype intended to demonstrate a privacy-preserving architecture for AI-assisted healthcare workflows.

It does not constitute legal advice, medical advice, or a certification of HIPAA compliance. Production deployment would require comprehensive technical, clinical, security, and legal validation.

---

## License

This project is currently intended as a hackathon prototype. Add your preferred open-source license, such as MIT, before publishing the repository.
