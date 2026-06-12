import json
import os
from utils import generate_with_retry, parse_json_response

def load_iso_clauses():
    kg_path = os.path.join(os.path.dirname(__file__), "../symbiosis_kg.json")
    with open(kg_path) as f:
        return json.load(f).get("iso_14001_clauses", [])

def run_iso_14000_agent(product_description: str, material_flow: dict, lca: dict, model) -> dict:
    clauses = load_iso_clauses()
    lca_alignment = lca.get("iso_14044_alignment", "unknown")
    hotspots = lca.get("hotspots", [])

    prompt = f"""You are the ISO 14000 Compliance Agent in the MACEA system. You check environmental management compliance against ISO 14001 (EMS) and ISO 14044 (LCA).

PRODUCT/PROCESS:
{product_description}

LCA RESULTS SUMMARY:
- ISO 14044 alignment status: {lca_alignment}
- Environmental hotspots: {json.dumps(hotspots)}
- Total carbon score: {lca.get("total_carbon_score", "unknown")}/100

ISO 14001 CLAUSES TO CHECK:
{json.dumps(clauses, indent=2)}

Your task: Assess compliance against each clause, flag non-conformances, and provide corrective actions.

Respond ONLY with a valid JSON object in this exact structure (no markdown, no extra text):
{{
  "agent": "ISO 14000",
  "clause_assessments": [
    {{
      "clause": "clause name",
      "status": "compliant/partial/non-compliant/unknown",
      "finding": "what was found",
      "corrective_action": "what needs to be done"
    }}
  ],
  "overall_compliance_score": 0,
  "critical_non_conformances": ["most serious issues that must be fixed"],
  "minor_non_conformances": ["issues that should be fixed but are not critical"],
  "certification_readiness": "ready/needs_work/major_gaps",
  "estimated_months_to_certification": 12,
  "priority_actions": ["top 3 actions to take first"],
  "summary": "2-3 sentence plain English summary"
}}"""

    text = generate_with_retry(model, prompt)
    return parse_json_response(text)
