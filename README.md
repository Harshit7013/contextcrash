# ContextCrash - AI Observability Dashboard

ContextCrash is a premium observability tool for AI-driven applications (RAG). It helps developers identify, diagnose, and resolve AI failures such as hallucinations, wrong retrievals, and context confusion.

## Features

- **Failure Diagnosis**: Automatically evaluate AI responses against retrieved context.
- **Unified Log History**: Group original failures and their subsequent fixes into a single audit trail.
- **Side-by-Side Comparison**: Contrast the "Original Failure" with the "Resolved State" to verify fixes.
- **Real-time Metrics**: Track Success Rate, Failure Distribution, and Avg Latency.
- **Interactive Re-runs**: Trigger a simulation of a fix directly from the dashboard to verify resolution.

## Tech Stack

- **Backend**: Flask (Python) with CORS support.
- **Frontend**: React (Vite) with vanilla CSS (Glassmorphic Design).
- **Icons**: Lucide-inspired SVG components.

## Getting Started

### 1. Start the Backend
```bash
python app.py
```
*Port: 5000*

### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
*Port: 5173*

## Observability Scenarios
The simulation logic in `app.py` allows you to test:
- **Hallucinations**: Search for "hostel refund".
- **Wrong Retrieval**: Search for "professor".
- **Context Confusion**: Search for "fee".
- **Success**: Search for "exams".

---
*Created with ❤️ by Antigravity*
