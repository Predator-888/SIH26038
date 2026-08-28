"""
Clinical Report Summary & Lesion Quadrant Analyzer (SIH26038).
Converts raw segmented lesion coordinates into structured clinical narrative strings
correlated with standard ophthalmological anatomical quadrants.
"""

from typing import List, Dict, Any, Tuple
from collections import defaultdict


QUADRANTS = {
    "ST": "superior temporal",
    "SN": "superior nasal",
    "IT": "inferior temporal",
    "IN": "inferior nasal",
    "MAC": "macular region"
}


def get_lesion_quadrant(bbox: List[float], center: Tuple[float, float] = (0.5, 0.5)) -> str:
    """
    Determines anatomical quadrant from normalized bounding box [x, y, w, h].
    Center default is (0.5, 0.5) representing the optical posterior center.
    """
    bx, by, bw, bh = bbox
    cx = bx + (bw / 2.0)
    cy = by + (bh / 2.0)

    # Check macular proximity (within 15% distance from central macula)
    dist_to_center = ((cx - 0.45) ** 2 + (cy - 0.50) ** 2) ** 0.5
    if dist_to_center < 0.12:
        return "macular region"

    # Standard quadrants
    is_superior = cy < center[1]
    is_temporal = cx < center[0]  # Standard assumption for right eye fundus (temporal on left)

    if is_superior and is_temporal:
        return "superior temporal"
    elif is_superior and not is_temporal:
        return "superior nasal"
    elif not is_superior and is_temporal:
        return "inferior temporal"
    else:
        return "inferior nasal"


def generate_clinical_summary_text(lesions: List[Dict[str, Any]], grade: int) -> str:
    """
    Generates scannable, natural clinical language summary of lesion findings.
    Designed for <30 second ophthalmologist comprehension.
    """
    if not lesions:
        if grade == 0:
            return "Normal retinal vasculature. No microaneurysms, hemorrhages, or exudates detected."
        else:
            return "Early vascular changes noted without prominent focal lesions detected."

    # Group counts by lesion type and quadrant
    counts_by_type = defaultdict(lambda: defaultdict(int))
    for lesion in lesions:
        l_type = lesion["type"]
        quad = get_lesion_quadrant(lesion["bbox"])
        counts_by_type[l_type][quad] += 1

    summary_clauses = []
    for l_type, quad_dict in counts_by_type.items():
        type_name = l_type.replace("_", " ")
        quad_details = []
        total_type_count = 0
        for quad, count in quad_dict.items():
            total_type_count += count
            quad_details.append(f"{count} in {quad}")
        
        plural_suffix = "s" if total_type_count > 1 and not type_name.endswith("s") else ""
        clause = f"{total_type_count} {type_name}{plural_suffix} ({', '.join(quad_details)})"
        summary_clauses.append(clause)

    return ". ".join(summary_clauses).capitalize() + "."
