import json
import os
from utils import generate_with_retry, parse_json_response

def load_knowledge_graph():
    kg_path = os.path.join(os.path.dirname(__file__), "../symbiosis_kg.json")
    with open(kg_path) as f:
        return json.load(f)

def run_industrial_ecology_agent(product_description: str, material_flow: dict, model) -> dict:
    kg = load_knowledge_graph()
    waste_streams = material_flow.get("waste_streams", [])
    symbiosis_pairs = kg.get("symbiosis_pairs", [])

    prompt = f"""You are the Industrial Ecology Agent in the MACEA system. You identify industrial symbiosis opportunities — where waste from one industry becomes input for another.

PRODUCT/PROCESS:
{product_description}

WASTE STREAMS FROM THIS PROCESS:
{json.dumps(waste_streams, indent=2)}

KNOWN SYMBIOSIS PAIRS IN KNOWLEDGE BASE:
{json.dumps(symbiosis_pairs, indent=2)}

Your task:
1. Match the waste streams to known symbiosis opportunities in the knowledge base
2. Propose new symbiosis opportunities not in the knowledge base
3. Calculate estimated carbon savings

Respond ONLY with a valid JSON object in this exact structure (no markdown, no extra text):
{{
  "agent": "Industrial Ecology",
  "matched_symbiosis": [
    {{
      "waste_stream": "waste name from this process",
      "partner_industry": "who can use this waste",
      "use_case": "how they use it",
      "carbon_saving_kg_per_tonne": 100,
      "feasibility": "high/medium/low",
      "source": "knowledge_base/proposed"
    }}
  ],
  "total_potential_carbon_saving_kg": 0,
  "symbiosis_score": 0,
  "unmatched_waste_streams": ["waste streams with no symbiosis match yet"],
  "recommended_industrial_zones": ["areas near Bangalore where symbiosis could be set up"],
  "summary": "2-3 sentence plain English summary"
}}"""

    text = generate_with_retry(model, prompt)
    return parse_json_response(text)
