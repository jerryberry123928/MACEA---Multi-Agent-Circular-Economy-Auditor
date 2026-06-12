from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
from groq import Groq
import asyncio
import json
import os
from dotenv import load_dotenv

from agents.material_flow import run_material_flow_agent
from agents.lca_scorer import run_lca_scorer_agent
from agents.circularity_gap import run_circularity_gap_agent
from agents.industrial_ecology import run_industrial_ecology_agent
from agents.iso_14000 import run_iso_14000_agent
from agents.sdg_policy import run_sdg_policy_agent
from synthesis import run_synthesis

load_dotenv(override=True)

app = FastAPI(title="MACEA API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class AuditRequest(BaseModel):
    product: str

def get_model():
    load_dotenv(override=True)
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or api_key.strip() in ("your_groq_api_key_here", "", "YOUR_API_KEY"):
        raise ValueError(
            "GROQ_API_KEY not configured. Open backend/.env and replace the placeholder "
            "with your real Groq API key."
        )
    client = Groq(api_key=api_key.strip())
    return {
        "client": client,
        "model_name": "llama-3.3-70b-versatile"
    }

@app.get("/")
def root():
    return {"status": "MACEA API running", "version": "1.0.0"}

@app.post("/audit")
async def audit(request: AuditRequest):
    """Run full MACEA audit — returns complete JSON result (non-streaming)."""
    if not request.product.strip():
        raise HTTPException(status_code=400, detail="Product description cannot be empty")
    
    try:
        model = get_model()
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    product = request.product.strip()
    results = {}

    try:
        results["material_flow"] = run_material_flow_agent(product, model)
        results["lca"] = run_lca_scorer_agent(product, results["material_flow"], model)
        results["circularity"] = run_circularity_gap_agent(product, results["material_flow"], model)
        results["industrial_ecology"] = run_industrial_ecology_agent(product, results["material_flow"], model)
        results["iso_14000"] = run_iso_14000_agent(product, results["material_flow"], results["lca"], model)
        results["sdg_policy"] = run_sdg_policy_agent(product, results["circularity"], results["lca"], results["industrial_ecology"], model)
        results["synthesis"] = run_synthesis(
            product,
            results["material_flow"],
            results["lca"],
            results["circularity"],
            results["industrial_ecology"],
            results["iso_14000"],
            results["sdg_policy"],
            model
        )
        return results
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Agent returned invalid JSON: {str(e)}")
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@app.post("/audit/stream")
async def audit_stream(request: AuditRequest):
    """Run full MACEA audit with SSE streaming — sends each agent result as it completes."""
    if not request.product.strip():
        raise HTTPException(status_code=400, detail="Product description cannot be empty")

    try:
        model = get_model()
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    product = request.product.strip()

    async def event_generator():
        agent_results = {}
        
        steps = [
            ("material_flow",    "Material Flow Analyst",   lambda: run_material_flow_agent(product, model)),
            ("lca",              "LCA Scorer",              lambda: run_lca_scorer_agent(product, agent_results["material_flow"], model)),
            ("circularity",      "Circularity Gap",         lambda: run_circularity_gap_agent(product, agent_results["material_flow"], model)),
            ("industrial_ecology","Industrial Ecology",     lambda: run_industrial_ecology_agent(product, agent_results["material_flow"], model)),
            ("iso_14000",        "ISO 14000",               lambda: run_iso_14000_agent(product, agent_results["material_flow"], agent_results["lca"], model)),
            ("sdg_policy",       "SDG Policy",              lambda: run_sdg_policy_agent(product, agent_results["circularity"], agent_results["lca"], agent_results["industrial_ecology"], model)),
        ]

        for key, name, fn in steps:
            yield {
                "event": "agent_start",
                "data": json.dumps({"agent": name, "status": "running"})
            }
            await asyncio.sleep(0)  # yield control
            try:
                result = await asyncio.get_event_loop().run_in_executor(None, fn)
                agent_results[key] = result
                yield {
                    "event": "agent_done",
                    "data": json.dumps({"agent": name, "key": key, "result": result})
                }
            except Exception as e:
                yield {
                    "event": "agent_error",
                    "data": json.dumps({"agent": name, "error": str(e)})
                }
                return

        # Synthesis
        yield {"event": "agent_start", "data": json.dumps({"agent": "Synthesis", "status": "running"})}
        await asyncio.sleep(0)
        try:
            synthesis = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: run_synthesis(product, agent_results["material_flow"], agent_results["lca"],
                                       agent_results["circularity"], agent_results["industrial_ecology"],
                                       agent_results["iso_14000"], agent_results["sdg_policy"], model)
            )
            yield {"event": "synthesis_done", "data": json.dumps({"result": synthesis})}
        except Exception as e:
            yield {"event": "agent_error", "data": json.dumps({"agent": "Synthesis", "error": str(e)})}
            return

        yield {"event": "complete", "data": json.dumps({"status": "audit_complete"})}

    return EventSourceResponse(event_generator())
