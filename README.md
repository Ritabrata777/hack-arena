# MediChain - Blockchain-Powered Healthcare Platform

> **Revolutionizing Healthcare with AI and Blockchain Technology**

MediChain addresses critical healthcare challenges: preventable medical errors, fraudulent fundraising, and lack of transparency in medical donations. Our platform combines AI-powered symptom triage, verified doctor networks, and transparent blockchain-based fundraising to ensure patients receive the care and financial support they need.

## 🌟 Key Features

### 🤖 AI-Powered Healthcare
- **Intelligent Symptom Triage**: AI chatbot provides initial health guidance and symptom analysis
- **Smart Prescription Generation**: AI-assisted prescription recommendations
- **Anomaly Detection**: Advanced AI algorithms detect potential health anomalies
- **Contextual Health Insights**: Personalized health recommendations based on patient history

### 👨‍⚕️ Verified Doctor Network
- **Reputation Scoring System**: Doctors earn trust through verified credentials and patient feedback
- **Transparent Profiles**: Complete doctor profiles with specialties, ratings, and availability
- **Secure Communication**: Encrypted messaging between patients and healthcare providers
- **Appointment Management**: Streamlined booking and scheduling system

### 💰 Transparent Fundraising
- **Blockchain-Verified Campaigns**: All fundraising campaigns are verified by licensed doctors
- **Real-Time Donation Tracking**: Transparent donation history with blockchain verification
- **Smart Contract Integration**: Automated fund distribution using Aptos blockchain
- **Donor Transparency**: Complete audit trail of all donations and fund usage

### 🔐 Secure Health Records
- **Encrypted Health Vault**: Patient-controlled health record storage
- **Emergency Access Codes**: Secure emergency access with audit trails
- **Consent Management**: Granular privacy controls for health data sharing
- **Blockchain Security**: Immutable health record storage on Aptos blockchain

## 🏗️ Architecture

### Frontend
- **Next.js 14**: React-based framework with App Router
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Shadcn/ui**: Modern component library for consistent UI
- **TypeScript**: Type-safe development environment

### Backend
- **Node.js**: Server-side JavaScript runtime
- **MongoDB**: NoSQL database for flexible data storage
- **Aptos Blockchain**: Layer 1 blockchain for secure transactions
- **AI Integration**: Google Gemini AI for intelligent health assistance

### Blockchain Integration
- **Aptos Move**: Smart contracts for fundraising and health records
- **Wallet Integration**: Petra wallet for secure transactions
- **Transaction Verification**: Real-time blockchain transaction monitoring
- **Smart Contracts**: Automated fund distribution and record management

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB Atlas account
- Aptos wallet (Petra)
- Google AI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Moinakcodes/medichain.git
   cd medichain
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp config.env.example config.env
   ```
   
   Update `config.env` with your credentials:
   ```env
   # MongoDB Configuration
   MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/"
   MONGODB_DB_NAME="medichain"
   
   # Aptos Configuration
   PRIVATE_KEY="your_aptos_private_key"
   APTOS_TESTNET_RPC_URL="https://fullnode.testnet.aptoslabs.com/v1"
   
   # AI Configuration
   GOOGLE_API_KEY="your_google_ai_api_key"
   
   # Contract Addresses
   NEXT_PUBLIC_MEDI_CHAIN_CONTRACT_ADDRESS="your_contract_address"
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 📱 Platform Features

### For Patients
- **AI Health Assistant**: 24/7 intelligent health guidance
- **Doctor Directory**: Find and book appointments with verified doctors
- **Health Records**: Secure, patient-controlled medical history
- **Fundraising**: Request financial assistance for medical expenses
- **Emergency Access**: Share health data in critical situations

### For Doctors
- **Patient Management**: Comprehensive patient profiles and history
- **AI-Assisted Diagnosis**: AI-powered tools for better patient care
- **Fundraising Approval**: Review and approve patient fundraising requests
- **Secure Communication**: Encrypted messaging with patients
- **Reputation Building**: Build trust through verified credentials

### For Donors
- **Transparent Campaigns**: View verified fundraising campaigns
- **Real-Time Tracking**: Monitor how donations are used
- **Blockchain Verification**: All transactions are recorded on blockchain
- **Impact Measurement**: See the direct impact of your contributions

## 🔧 Technical Implementation

### Smart Contracts
- **MediChain Contract**: Core health record and patient management
- **Fundraiser Contract**: Transparent fundraising and donation tracking
- **Health Wallet Contract**: Secure health data storage and access control

### AI Integration
- **Symptom Analysis**: Advanced AI for initial health assessment
- **Prescription Generation**: AI-assisted medication recommendations
- **Anomaly Detection**: Machine learning for health pattern recognition
- **Natural Language Processing**: Conversational AI for health guidance

### Security Features
- **End-to-End Encryption**: All health data is encrypted
- **Blockchain Immutability**: Health records cannot be tampered with
- **Access Control**: Granular permissions for data sharing
- **Audit Trails**: Complete history of all data access and modifications

## 🌐 Deployment

### Production Deployment
1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy to Vercel/Netlify**
   ```bash
   npm run deploy
   ```

3. **Configure environment variables** in your hosting platform

### Docker Deployment
```bash
docker build -t medichain .
docker run -p 3000:3000 medichain
```

## 📊 Monitoring & Analytics

- **Real-time Health Metrics**: Track patient health trends
- **Donation Analytics**: Monitor fundraising campaign performance
- **Doctor Performance**: Track doctor ratings and patient outcomes
- **Platform Usage**: Comprehensive analytics dashboard

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 🔮 Roadmap

### Phase 1 (Current)
- ✅ AI-powered symptom triage
- ✅ Doctor verification system
- ✅ Blockchain fundraising
- ✅ Secure health records

### Phase 2 (Q2 2024)
- 🔄 Mobile application (iOS/Android)
- 🔄 Advanced AI diagnostics
- 🔄 Insurance integration
- 🔄 Telemedicine features

### Phase 3 (Q3 2024)
- 📋 Global doctor network
- 📋 Multi-language support
- 📋 Advanced analytics
- 📋 Enterprise solutions

---
