"""Dedicated prompt templates and formatting utilities for CivicTriage LLM classification."""

import json


def build_triage_prompt(complaint: str, taxonomy: dict, gazetteer: dict) -> str:
    """Construct structured instruction prompt for civic complaint triage.

    Args:
        complaint: Verbatim citizen complaint text (English, Hindi, or Hinglish).
        taxonomy: Municipal departments and category hierarchy dictionary.
        gazetteer: Localities, wards, and alias mapping dictionary.

    Returns:
        Formatted prompt string instructing LLM to return structured JSON.
    """
    # Compact representation of departments and categories
    dept_cat_list = []
    for d in taxonomy.get("departments", []):
        d_name = d["name"]
        cats = ", ".join(d["categories"])
        dept_cat_list.append(f"- {d_name}: [{cats}]")
    taxonomy_str = "\n".join(dept_cat_list)

    # Compact representation of localities, wards, and aliases
    loc_list = []
    for loc in gazetteer.get("localities", []):
        name = loc["name"]
        ward = loc["ward"]
        aliases = ", ".join(loc.get("aliases", []))
        loc_list.append(f"- {name} (Ward {ward}) | Aliases: [{aliases}]")
    gazetteer_str = "\n".join(loc_list)

    prompt = f"""You are the automated Chief Triage Officer for Bhopal Municipal Civic Grievance Cell (CivicTriage).
Your task is to analyze the following citizen complaint and extract structured classification details matching the ComplaintTriage schema.

CITIZEN COMPLAINT:
\"\"\"{complaint}\"\"\"

OFFICIAL MUNICIPAL TAXONOMY:
{taxonomy_str}

OFFICIAL LOCALITY & WARD GAZETTEER:
{gazetteer_str}

CLASSIFICATION RULES & CONSTRAINTS:
1. language: Identify the primary language format ("English", "Hindi", or "Hinglish").
2. department: Must be chosen strictly from the supplied taxonomy departments. NEVER invent a department.
3. category: Must be chosen strictly from the categories listed under the selected department. NEVER invent a category.
4. locality: Identify if a known locality or any of its aliases (in English, Hindi, or Hinglish) is mentioned. If recognized, return the CANONICAL locality name (e.g., if 'कोलार' or 'Kolar side' is mentioned, return 'Kolar'). If no locality is mentioned or it cannot be resolved with certainty, return null.
5. ward: If a locality is identified, return the exact ward number mapped to it in the gazetteer. If locality is null, ward MUST be null. NEVER invent a ward number.
6. duration: Extract temporal phrases specifying how long the issue has persisted (e.g., '3 days', '3 din se', 'yesterday'), or null if unmentioned.
7. evidence: Provide a list of 2-5 verbatim short phrases extracted directly from the complaint text that justify the category and locality classification.
8. summary: Provide a clear, objective 1-2 sentence English summary of the issue.
9. confidence: A float between 0.0 and 1.0 reflecting your classification certainty (lower if ambiguous or information is missing).

Return the classification strictly complying with the ComplaintTriage JSON schema.
"""
    return prompt
