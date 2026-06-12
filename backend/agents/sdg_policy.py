import json
from utils import generate_with_retry, parse_json_response

SDG_TARGETS = {
    "SDG 11": "Sustainable Cities and Communities — make cities inclusive, safe, resilient, sustainable",
    "SDG 12": "Responsible Consumption and Production — ensure sustainable consumption and production patterns",
    "SDG 13": "Climate Action — take urgent action to combat climate change and its impacts"
}

INDIA_CCTS_INFO = """India's Carbon Credit Trading Scheme (CCTS) launched 2023 under Bureau of Energy Efficiency (BEE).
Eligible sectors: industry, buildings, transport, agriculture, forestry.
Carbon credits traded on Indian Carbon Market (ICM).
1 credit = 1 tonne CO2 equivalent reduced/removed.
Current indicative price: INR 800-1200 per credit (as of 2024)."""

def run_sdg_policy_agent(product_description: str, circularity: dict, lca: dict, industrial_ecology: dict, model) -> dict:
    circularity_score = circularity.get("overall_circularity_score", 0)
    carbon_score = lca.get("total_carbon_score", 0)
    carbon_saving = industrial_ecology.get("total_potential_carbon_saving_kg", 0)
    top_gaps = circularity.get("top_gaps", [])

    prompt = f"""You are the SDG Policy Agent in the MACEA system. You map circular economy findings to SDG targets and estimate carbon credit potential under India's CCTS.

PRODUCT/PROCESS:
{product_description}

KEY METRICS FROM OTHER AGENTS:
- Overall circularity score: {circularity_score}/100
- LCA carbon score (higher = worse): {carbon_score}/100
- Potential carbon saving from industrial symbiosis: {carbon_saving} kg CO2
- Top circularity gaps: {json.dumps(top_gaps)}

SDG TARGETS TO MAP:
{json.dumps(SDG_TARGETS, indent=2)}

INDIA CARBON CREDIT SCHEME:
{INDIA_CCTS_INFO}

Respond ONLY with a valid JSON object in this exact structure (no markdown, no extra text):
{{
  "agent": "SDG Policy",
  "sdg_mapping": [
    {{
      "sdg": "SDG 11",
      "alignment_score": 0,
      "positive_contributions": ["what this process does that supports this SDG"],
      "gaps": ["where this process falls short of this SDG"],
      "target_actions": ["specific actions to improve SDG alignment"]
    }}
  ],
  "overall_sdg_score": 0,
  "carbon_credits": {{
    "eligible": true,
    "estimated_annual_credits": 0,
    "estimated_annual_value_inr": 0,
    "eligible_interventions": ["which specific interventions qualify"]
  }},
  "policy_recommendations": ["3-5 policy-level recommendations for Indian context"],
  "bangalore_specific": ["2-3 recommendations specific to Bangalore/Karnataka context"],
  "summary": "2-3 sentence plain English summary"
}}"""

    text = generate_with_retry(model, prompt)
    return parse_json_response(text)
