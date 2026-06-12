import json
from utils import generate_with_retry, parse_json_response

def detect_conflicts(lca: dict, circularity: dict) -> list:
    """Detect contradictions between agent outputs."""
    conflicts = []

    # Classic conflict: recycling scores high on circularity but transport tanks LCA
    lca_score = lca.get("total_carbon_score", 50)
    circ_score = circularity.get("overall_circularity_score", 50)

    if lca_score > 70 and circ_score > 70:
        conflicts.append({
            "type": "high_carbon_high_circularity",
            "description": "System appears circular but has high carbon footprint — likely due to transport or energy-intensive recycling",
            "resolution": "Prioritize local symbiosis loops and on-site energy recovery over transport-heavy recycling"
        })

    # Check R scores for recycling vs higher-order Rs
    r_scores = circularity.get("r_scores", [])
    recycle_score = next((r["score"] for r in r_scores if r["r"] == "Recycle"), 0)
    refuse_score = next((r["score"] for r in r_scores if r["r"] == "Refuse"), 0)
    reuse_score = next((r["score"] for r in r_scores if r["r"] == "Reuse"), 0)

    if recycle_score > 7 and refuse_score < 3:
        conflicts.append({
            "type": "recycling_over_refusal",
            "description": "System relies heavily on recycling but ignores higher-order Rs (Refuse, Reduce, Reuse)",
            "resolution": "Recycling is the 9th R — investigate upstream options first: product redesign, dematerialization, or product-as-a-service models"
        })

    return conflicts


def run_synthesis(
    product_description: str,
    material_flow: dict,
    lca: dict,
    circularity: dict,
    industrial_ecology: dict,
    iso_14000: dict,
    sdg_policy: dict,
    model
) -> dict:
    conflicts = detect_conflicts(lca, circularity)

    # Weighted composite score
    weights = {
        "circularity": 0.30,
        "lca": 0.25,        # inverted (lower carbon = better)
        "iso": 0.20,
        "symbiosis": 0.15,
        "sdg": 0.10
    }

    lca_normalized = 100 - lca.get("total_carbon_score", 50)  # invert
    raw_score = (
        circularity.get("overall_circularity_score", 0) * weights["circularity"] +
        lca_normalized * weights["lca"] +
        iso_14000.get("overall_compliance_score", 0) * weights["iso"] +
        industrial_ecology.get("symbiosis_score", 0) * weights["symbiosis"] +
        sdg_policy.get("overall_sdg_score", 0) * weights["sdg"]
    )

    prompt = f"""You are the Synthesis orchestrator for MACEA. You have received outputs from all 6 specialist agents. Produce a final Circular Economy Audit Report.

PRODUCT/PROCESS AUDITED:
{product_description}

AGENT SCORES SUMMARY:
- Circularity Score: {circularity.get("overall_circularity_score", 0)}/100 (Grade: {circularity.get("circularity_grade", "?")})
- LCA Carbon Score: {lca.get("total_carbon_score", 0)}/100 (higher = worse)
- ISO 14000 Compliance: {iso_14000.get("overall_compliance_score", 0)}/100
- Industrial Symbiosis Score: {industrial_ecology.get("symbiosis_score", 0)}/100
- SDG Alignment Score: {sdg_policy.get("overall_sdg_score", 0)}/100
- Weighted MACEA Score: {raw_score:.1f}/100

DETECTED CONFLICTS BETWEEN AGENTS:
{json.dumps(conflicts, indent=2)}

TOP INTERVENTIONS FROM ALL AGENTS:
- Circularity quick wins: {json.dumps(circularity.get("quick_wins", []))}
- LCA improvements: {json.dumps(lca.get("improvement_potential", []))}
- ISO priority actions: {json.dumps(iso_14000.get("priority_actions", []))}
- SDG policy recs: {json.dumps(sdg_policy.get("policy_recommendations", [])[:3])}
- Carbon credits eligible: {sdg_policy.get("carbon_credits", {}).get("eligible", False)}

Respond ONLY with a valid JSON object (no markdown, no extra text):
{{
  "macea_score": {raw_score:.1f},
  "grade": "A/B/C/D/F",
  "executive_summary": "3-4 sentence overall verdict",
  "conflict_resolutions": [
    {{"conflict": "description", "resolution": "how it was resolved"}}
  ],
  "top_10_interventions": [
    {{"rank": 1, "action": "specific action", "impact": "high/medium/low", "timeline": "immediate/short-term/long-term", "source_agent": "which agent flagged this"}}
  ],
  "roadmap": {{
    "immediate_0_3_months": ["actions"],
    "short_term_3_12_months": ["actions"],
    "long_term_1_3_years": ["actions"]
  }},
  "carbon_credit_opportunity": "{sdg_policy.get('carbon_credits', {}).get('estimated_annual_value_inr', 0)} INR/year estimated",
  "certification_path": "plain English path to ISO 14001 certification"
}}"""

    text = generate_with_retry(model, prompt)
    result = parse_json_response(text)
    result["conflicts_detected"] = conflicts
    result["score_breakdown"] = {
        "circularity": circularity.get("overall_circularity_score", 0),
        "lca_inverted": round(lca_normalized, 1),
        "iso_compliance": iso_14000.get("overall_compliance_score", 0),
        "symbiosis": industrial_ecology.get("symbiosis_score", 0),
        "sdg_alignment": sdg_policy.get("overall_sdg_score", 0),
        "weighted_total": round(raw_score, 1)
    }
    return result
