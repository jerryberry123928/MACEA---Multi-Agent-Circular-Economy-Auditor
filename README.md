# MACEA — Multi-Agent Circular Economy Auditor

MACEA is a state-of-the-art computational circularity auditor designed to assess products, supply chains, and manufacturing facilities across circular economy metrics, lifecycle analysis (LCA), and ISO compliance standards. It uses a multi-agent framework powered by Groq to run audits in parallel and synthesize compliance conflicts and recommendations.

---

## Architecture Overview

MACEA orchestrates **6 specialized AI agents** that run analyses and debate their findings before generating a unified synthesis report:

1. **Material Flow Analyst** — Maps incoming resources, transformation stages, and output waste streams.
2. **LCA Scorer** — Scores Carbon Footprint, Water Use, and Resource Depletion metrics (out of 100) and provides justification.
3. **Circularity Gap Evaluator** — Rates circularity against the 10R waste hierarchy (from Refuse to Recover) and identifies linear "take-make-dispose" patterns.
4. **Industrial Ecology Specialist** — Queries local/regional databases to match waste outputs with potential industrial symbiosis partners (e.g., exchanging heat, ash, or slag).
5. **ISO 14000 Compliance Officer** — Performs gap analysis against ISO 14001, 14040, and 14044 clauses.
6. **SDG Policy Evaluator** — Scores alignment against UN Sustainable Development Goals (SDG 11, SDG 12, SDG 13) and estimates carbon credit values.

---

## Setup and Installation

### Prerequisites
* Python 3.9+
* Node.js & npm
* A Groq API Key (from the [Groq Console](https://console.groq.com/))

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install the dependencies:
   ```bash
   pip3 install -r requirements.txt
   ```
3. Create/Configure your `.env` file:
   Make sure `backend/.env` has your Groq API key:
   ```env
   GROQ_API_KEY=gsk_your_key_here
   ```

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

---

## Running the Application

To run the application, open two separate terminal tabs/windows and launch the backend and frontend:

### Start the Backend
```bash
cd backend
uvicorn main:app --reload --port 8000
```
*The backend API will run at `http://localhost:8000`.*

### Start the Frontend
```bash
cd frontend
npm start
```
*The React Dashboard will open automatically at `http://localhost:3000`.*

---

## Dynamic Key Reloading
MACEA is configured to reload environment variables dynamically on every request. If your Groq API key runs out of credits, simply paste a new key into `backend/.env` and save. You **do not** need to restart the backend server; the next audit request will pick up the new key automatically.
