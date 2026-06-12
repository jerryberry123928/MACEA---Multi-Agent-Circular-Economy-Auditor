import json
from utils import generate_with_retry, parse_json_response

R_HIERARCHY = [
    {"r": "Refuse",      "description": "Eliminate the product/material entirely — is it even needed?"},
    {"r": "Rethink",     "description": "Redesign the business model (e.g. product-as-a-service)"},
    {"r": "Reduce",      "description": "Minimize material and energy use in production/use"},
    {"r": "Reuse",       "description": "Use the product again for the same purpose"},
    {"r": "Repair",      "description": "Fix and maintain to extend life"},
    {"r": "Refurbish",   "description": "Restore to good working condition"},
    {"r": "Remanufacture","description": "Use parts in a new product of same function"},
    {"r": "Repurpose",   "description": "Use product/parts in a different function"},
    {"r": "Recycle",     "description": "Process materials to obtain same or lower quality"},
    {"r": "Recover",     "description": "Energy recovery as last resort before disposal"}
]

def run_circularity_gap_agent(product_description: str, material_flow: dict, model) -> dict:
    waste_streams = material_flow.get("waste_streams", [])
    linear_flags = material_flow.get("linear_economy_flags", [])

    prompt = f"""You are the Circularity Gap Agent in the MACEA system. You are the most analytically novel agent — your job is to score the system against the full 10R circularity hierarchy.

PRODUCT/PROCESS:
{product_description}

WASTE STREAMS IDENTIFIED:
{json.dumps(waste_streams, indent=2)}

LINEAR ECONOMY FLAGS:
{json.dumps(linear_flags, indent=2)}

THE 10R HIERARCHY (from most circular to least):
{json.dumps(R_HIERARCHY, indent=2)}

Your task: For each R, assess whether the current system practices it, could practice it, or it is not applicable.

Respond ONLY with a valid JSON object in this exact structure (no markdown, no extra text):
{{
  "agent": "Circularity Gap",
  "r_scores": [
    {{
      "r": "Refuse",
      "current_status": "practiced/partial/absent/not_applicable",
      "score": 5,
      "gap": "what is missing or could be done",
      "intervention": "specific actionable recommendation"
    }}
  ],
  "overall_circularity_score": 0,
  "circularity_grade": "A/B/C/D/F",
  "top_gaps": ["3 most critical gaps in order of impact"],
  "quick_wins": ["2-3 easiest interventions that could be implemented immediately"],
  "transformation_potential": "high/medium/low",
  "summary": "2-3 sentence plain English summary of circularity status"
}}

Make sure r_scores has exactly 10 entries, one for each R in order."""

    text = generate_with_retry(model, prompt)
    return parse_json_response(text)
