# MediChain

Patient-owned medical records, verified doctors, emergency access, and transparent medical fundraising.

MediChain is a blockchain-powered healthcare platform that helps patients carry their medical history across doctors and hospitals. It combines MongoDB-backed health records, wallet-based identity, verified doctor profiles, AI assistance, emergency health vaults, and transparent fundraising workflows.

## Real-Life Problem

Healthcare records are often scattered across paper files, WhatsApp messages, hospital systems, and patient memory. This creates serious problems:

- Patients lose prescriptions, reports, and old consultation notes.
- Doctors often treat patients without full medical history.
- Emergency teams may not know allergies, blood group, current medicines, or chronic conditions.
- Fake or unverifiable medical fundraising reduces donor trust.
- Patients rarely know who accessed their sensitive medical data.

MediChain solves this by giving every patient a portable, wallet-linked health profile that can be updated by verified doctors and accessed safely in emergencies.

## What MediChain Does

- Stores patient profiles, documents, consultations, appointments, and health vault data.
- Lets doctors register with license, specialization, clinic, and verification status.
- Allows doctors to create consultation logs and digital health records.
- Gives patients control over health documents and sharing permissions.
- Provides emergency access to critical information with audit logging.
- Supports medical fundraising requests verified by doctors and admins.
- Tracks doctor-patient messages, appointments, renewals, and fundraiser proofs.
- Uses AI for symptom triage, document understanding, summaries, and anomaly detection.
- Uses blockchain transactions for trust, transparency, and verifiable medical actions.

## Why It Is Required

This project is not just a "healthcare app with blockchain." The real need is a trusted medical data layer that follows the patient.

In real life, a patient may visit one clinic today, another hospital tomorrow, and need emergency care somewhere else next month. Without a shared, trusted record, doctors waste time, patients repeat tests, and critical details can be missed. MediChain reduces that gap by making medical history portable, consent-aware, and verifiable.

## Key Features

### Patient Portal

- Wallet-based login
- Personal profile
- Medical documents
- Health vault
- Emergency summary
- Consent management
- Appointment booking
- Medical fundraising requests
- Chat with doctors

### Doctor Portal

- Doctor registration
- License and specialization profile
- Verification status
- Patient consultations
- Medical logs
- Appointment management
- Prescription renewal requests
- Fundraiser verification
- Secure messaging

### Admin Portal

- Doctor verification
- User management
- Fundraiser approval
- Donation and request visibility
- Fraud/anomaly review
- Platform oversight

### Emergency Health Vault

Emergency responders can access only critical patient information, such as:

- Blood group
- Allergies
- Current medicines
- Emergency contact
- Important health documents
- Recent medical summary

This is useful when a patient cannot explain their condition.

### Transparent Medical Fundraising

Patients can request financial help for treatment. Doctors and admins can verify the request before it becomes visible as a trusted campaign. This helps donors identify genuine medical cases.

## Hackathon Demo Flow

1. Patient logs in with wallet and creates a health profile.
2. Doctor logs in and appears as a verified medical professional.
3. Doctor creates a consultation record for the patient.
4. Patient opens their dashboard and sees the medical record.
5. Emergency access reveals only critical data.
6. Patient submits a fundraiser request.
7. Doctor/admin verifies it.
8. Donors can see a more trustworthy medical fundraiser.

## Tech Stack

- Next.js 15
- React
- Tailwind CSS
- Shadcn UI components
- MongoDB Atlas
- Ethers.js
- Solidity smart contracts
- Polygon Amoy testnet
- Google Gemini AI
- Genkit

## Local Setup

### Prerequisites

- Node.js 18 or newer
- MongoDB Atlas database
- MetaMask wallet
- Google AI API key
- Polygon Amoy RPC URL

### Install

```bash
git clone https://github.com/Ritabrata777/hack-arena.git
cd hack-arena
npm install
```

### Configure Environment

Create `.env.local` and add the required values:

```env
MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/database"
MONGODB_DB_NAME="medichain"

AMOY_RPC_URL="your_polygon_amoy_rpc_url"
NEXT_PUBLIC_AMOY_RPC_URL="your_polygon_amoy_rpc_url"

PRIVATE_KEY="your_testnet_private_key"
GOOGLE_API_KEY="your_google_ai_key"

NEXT_PUBLIC_MEDI_CHAIN_CONTRACT_ADDRESS="deployed_contract_address"
NEXT_PUBLIC_FUNDRAISER_CONTRACT_ADDRESS="deployed_contract_address"
```

### Run

```bash
npm run dev
```

Open:

```text
http://localhost:9002
```

## Useful Commands

```bash
npm run lint
npm run typecheck
npm run build
```

## Best Real-Life Use Cases

- Emergency access when a patient is unconscious
- Recovering lost prescriptions and reports
- Doctor-to-doctor patient transfer
- Rural health camps with portable patient history
- Verified medical crowdfunding
- Chronic disease follow-up across multiple doctors
- Audit trail for sensitive medical data access

## Future Improvements

- Emergency QR health passport
- Medicine allergy and drug interaction safety check
- Cross-hospital transfer pack
- Insurance claim document bundle
- Multilingual patient summaries
- Doctor reputation scoring from verified consultations

## One-Line Pitch

MediChain gives patients a portable, verifiable medical record and gives doctors trusted access to the right health data when it matters most.
