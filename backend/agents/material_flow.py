import json
from utils import generate_with_retry, parse_json_response

def run_material_flow_agent(product_description: str, model) -> dict:
    prompt = f"""You are the Material Flow Analyst agent in the MACEA (Multi-Agent Circular Economy Auditor) system.

Your task: Analyze the following product/process/supply chain and map its complete material flow.

INPUT:
{product_description}

Respond ONLY with a valid JSON object in this exact structure (no markdown, no extra text):
{{
  "agent": "Material Flow Analyst",
  "inputs": [
    {{"material": "name", "quantity_estimate": "rough estimate", "source": "where it comes from"}}
  ],
  "transformation_stages": [
    {{"stage": "stage name", "process": "what happens", "energy_use": "high/medium/low"}}
  ],
  "outputs": [
    {{"type": "product/byproduct/waste", "material": "name", "destination": "where it goes"}}
  ],
  "waste_streams": [
    {{"waste": "waste name", "type": "solid/liquid/gas/heat", "hazardous": true, "current_disposal": "landfill/recycled/incinerated/unknown"}}
  ],
  "linear_economy_flags": ["list of take-make-dispose patterns identified"],
  "summary": "2-3 sentence plain English summary of the material flow"
}}"""

    text = generate_with_retry(model, prompt)
    return parse_json_response(text)
