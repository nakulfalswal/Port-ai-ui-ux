# PortAI – Institutional Finance Intelligence for Everyone

[![Hackathon](https://img.shields.io/badge/Hackathon-Project-blueviolet?style=for-the-badge)](https://github.com/your-username/PortAI_)
[![Tech Stack](https://img.shields.io/badge/Tech_Stack-FastAPI_%7C_Next.js_%7C_Groq-blue?style=for-the-badge)](https://github.com/your-username/PortAI_)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**PortAI** is an elite, institutional-grade financial intelligence platform designed specifically for Indian retail investors. By leveraging hyper-local market data and state-of-the-art AI, PortAI democratizes the sophisticated analysis typically reserved for hedge funds.

---

## 🚀 Vision
Retail investors in India often lack the tools to perform deep, data-driven analysis of their portfolios. They are prone to behavioral biases and often miss critical market signals. PortAI bridges this gap by providing an AI-driven "Analyst in your Pocket" that understands the nuances of the Indian stock market (NSE/BSE).

## ✨ Key Features

### 1. 🧠 Institutional AI Analysis
- Powered by **Groq (Llama 3.3 70B)** for lightning-fast, high-reasoning financial reports.
- **Context-Aware**: Analyzes stocks with live data from Yahoo Finance, NewsAPI, Alpha Vantage, and FRED.
- **Behavioral Insights**: Identifies biases like "Herd Mentality" or "Loss Aversion" in your portfolio.

### 2. 📊 Real-time Indian Market Monitoring
- Live tracking of **Nifty 50, Sensex, Nifty Bank**, and other major indices.
- **Sector Performance**: Heatmaps and performance tracking for IT, Banking, Energy, FMCG, and more.
- **Trending Stocks**: Real-time movers in the Indian market.

### 3. 📂 AI Portfolio Parsing (OCR & PDF)
- Upload your portfolio statements in **PDF** or even **Screenshots (JPG/PNG)**.
- Automated parsing extracts holdings and provides an immediate risk/reward analysis.

### 4. 🔌 Seamless Broker Integration
- Direct integration with **Upstox** to fetch live holdings and perform real-time portfolio audits.

### 5. 📰 Curated Financial Intelligence
- High-signal news feed aggregation from major Indian financial outlets.
- Insider sentiment tracking via Finnhub.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, Framer Motion (Animations), Chart.js (Visuals), Three.js (3D Elements).
- **Backend**: FastAPI (Python), Uvicorn.
- **AI/ML**: Groq Cloud LLM (Llama 3.3 70B), Pytesseract (OCR), PyPDF2 (PDF Parsing).
- **Data APIs**: yfinance, NewsAPI, Alpha Vantage, Finnhub, FRED.
- **Database**: Supabase (PostgreSQL).
- **DevOps**: Docker, Docker Compose, Kubernetes.

---

## 🏗️ Getting Started

### Prerequisites
- Docker & Docker Compose
- API Keys for: Groq, NewsAPI, Alpha Vantage, Supabase (details in `.env.example`)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/PortAI_.git
   cd PortAI_
   ```

2. **Configure Environment Variables**
   - Copy `backend/.env.example` to `backend/.env` and fill in your keys.
   ```bash
   cp backend/.env.example backend/.env
   ```

3. **Run with Docker Compose**
   ```bash
   docker-compose up --build
   ```

4. **Access the App**
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:8000/docs`

---

## 🛠️ Issue Check & Code Audit
During development, we identified and resolved the following:
- 🐞 **Dependency Audit**: Added missing OCR (`pytesseract`) and PDF (`PyPDF2`) libraries to `requirements.txt`.
- 🐞 **System Requirements**: Updated Dockerfile to include `tesseract-ocr` system binaries.
- 🐞 **Error Handling**: Implemented multi-layered fallback for market data when primary APIs are unavailable.
- 🐞 **Contextual Intelligence**: Enhanced the NLP parser to recognize over 50+ major Indian ticker aliases (e.g., "Reliance" -> "RELIANCE.NS").

---

---

## 🤝 Team
- **Harsheet Dwivedi** - AI Architect & Systems Integration Specialist
- **Pratham Singh Shaurya** - Frontend Lead & UI/UX Designer
- **Macmilan Cyril Singh** - Technical Operations & Quality Assurance Lead

---

## 📜 License
Available under the MIT License.
