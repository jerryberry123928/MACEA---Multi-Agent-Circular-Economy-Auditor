import json
from utils import generate_with_retry, parse_json_response

def run_lca_scorer_agent(product_description: str, material_flow: dict, model) -> dict:
    waste_streams = material_flow.get("waste_streams", [])
    stages = material_flow.get("transformation_stages", [])

    prompt = f"""You are the LCA Scorer agent in the MACEA system. You perform Life Cycle Assessment aligned with ISO 14044.

PRODUCT/PROCESS:
{product_description}

MATERIAL FLOW ANALYSIS (from previous agent):
Transformation stages: {json.dumps(stages, indent=2)}
Waste streams: {json.dumps(waste_streams, indent=2)}

Your task: Estimate carbon footprint and environmental impact across the product lifecycle.

Respond ONLY with a valid JSON object in this exact structure (no markdown, no extra text):
{{
  "agent": "LCA Scorer",
  "lifecycle_stages": {{
    "raw_material_extraction": {{"carbon_score": 0, "impact_level": "high/medium/low", "key_concern": "main issue"}},
    "manufacturing": {{"carbon_score": 0, "impact_level": "high/medium/low", "key_concern": "main issue"}},
    "distribution": {{"carbon_score": 0, "impact_level": "high/medium/low", "key_concern": "main issue"}},
    "use_phase": {{"carbon_score": 0, "impact_level": "high/medium/low", "key_concern": "main issue"}},
    "end_of_life": {{"carbon_score": 0, "impact_level": "high/medium/low", "key_concern": "main issue"}}
  }},
  "total_carbon_score": 0,
  "hotspots": ["top 3 highest impact areas"],
  "carbon_footprint_estimate_kg_co2": "rough estimate with unit (e.g. 2.4 kg CO2e per unit)",
  "iso_14044_alignment": "compliant/partial/non-compliant",
  "improvement_potential": ["3 specific recommendations to reduce carbon score"],
  "summary": "2-3 sentence plain English summary"
}}

Note: total_carbon_score MUST be a number between 0 and 100, where 100 means extreme carbon impact."""

    text = generate_with_retry(model, prompt)
    return parse_json_response(text)
