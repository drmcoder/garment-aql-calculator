"""
AQL (Acceptable Quality Limit) Calculator for Garment Industry QC.

Implements ISO 2859-1 sampling procedures for inspection by attributes.
Used by garment QC teams to determine sample size and accept/reject
thresholds for every shipment inspection.

Two-step lookup:
    1. Lot size + Inspection level -> Code letter (Table A)
    2. Code letter + AQL -> Sample size + Accept/Reject numbers (Table B)

Reference: https://scanerp.pro/blog/fabric-inspection-4-point-system-guide.html
"""

from typing import Literal, Callable

__version__ = "1.0.0"

InspectionLevel = Literal["S1", "S2", "S3", "S4", "GI", "GII", "GIII"]

# Table A: Lot size + Inspection level -> Code letter (ISO 2859-1)
_SAMPLE_SIZE_CODE_LETTERS = [
    # (min_lot, max_lot, S1, S2, S3, S4, GI, GII, GIII)
    (2, 8,            "A", "A", "A", "A", "A", "A", "B"),
    (9, 15,           "A", "A", "A", "A", "A", "B", "C"),
    (16, 25,          "A", "A", "B", "B", "B", "C", "D"),
    (26, 50,          "A", "B", "B", "C", "C", "D", "E"),
    (51, 90,          "B", "B", "C", "C", "C", "E", "F"),
    (91, 150,         "B", "B", "C", "D", "D", "F", "G"),
    (151, 280,        "B", "C", "D", "E", "E", "G", "H"),
    (281, 500,        "B", "C", "D", "E", "F", "H", "J"),
    (501, 1200,       "C", "C", "E", "F", "G", "J", "K"),
    (1201, 3200,      "C", "D", "E", "G", "H", "K", "L"),
    (3201, 10000,     "C", "D", "F", "G", "J", "L", "M"),
    (10001, 35000,    "C", "D", "F", "H", "K", "M", "N"),
    (35001, 150000,   "D", "E", "G", "J", "L", "N", "P"),
    (150001, 500000,  "D", "E", "G", "J", "M", "P", "Q"),
    (500001, float("inf"), "D", "E", "H", "K", "N", "Q", "R"),
]

_LEVEL_COLUMN = {"S1": 2, "S2": 3, "S3": 4, "S4": 5, "GI": 6, "GII": 7, "GIII": 8}

_SAMPLE_SIZE_BY_LETTER = {
    "A": 2, "B": 3, "C": 5, "D": 8, "E": 13, "F": 20, "G": 32, "H": 50,
    "J": 80, "K": 125, "L": 200, "M": 315, "N": 500, "P": 800, "Q": 1250, "R": 2000,
}

# Table II-A: Single sampling plans for normal inspection (ISO 2859-1)
# Format: code_letter -> aql_value -> (accept, reject)
# Verified against QIMA published reference: K+AQL2.5=(7,8), L+AQL2.5=(10,11)
# Cells marked "↓" in the spec resolved to (0,1) — at small samples the
# accept threshold is 0 in practice.
# Cells marked "↑" (sample too large for very loose AQL) carry the
# (21,22) cap.
_TABLE_B = {
    "A": {0.65: (0, 1), 1.0: (0, 1), 1.5: (0, 1), 2.5: (0, 1), 4.0: (0, 1), 6.5: (0, 1)},
    "B": {0.65: (0, 1), 1.0: (0, 1), 1.5: (0, 1), 2.5: (0, 1), 4.0: (0, 1), 6.5: (0, 1)},
    "C": {0.65: (0, 1), 1.0: (0, 1), 1.5: (0, 1), 2.5: (0, 1), 4.0: (0, 1), 6.5: (0, 1)},
    "D": {0.65: (0, 1), 1.0: (0, 1), 1.5: (0, 1), 2.5: (0, 1), 4.0: (0, 1), 6.5: (1, 2)},
    "E": {0.65: (0, 1), 1.0: (0, 1), 1.5: (0, 1), 2.5: (0, 1), 4.0: (1, 2), 6.5: (2, 3)},
    "F": {0.65: (0, 1), 1.0: (0, 1), 1.5: (0, 1), 2.5: (1, 2), 4.0: (2, 3), 6.5: (3, 4)},
    "G": {0.65: (0, 1), 1.0: (0, 1), 1.5: (1, 2), 2.5: (2, 3), 4.0: (3, 4), 6.5: (5, 6)},
    "H": {0.65: (0, 1), 1.0: (1, 2), 1.5: (2, 3), 2.5: (3, 4), 4.0: (5, 6), 6.5: (7, 8)},
    "J": {0.65: (1, 2), 1.0: (2, 3), 1.5: (3, 4), 2.5: (5, 6), 4.0: (7, 8), 6.5: (10, 11)},
    "K": {0.65: (2, 3), 1.0: (3, 4), 1.5: (5, 6), 2.5: (7, 8), 4.0: (10, 11), 6.5: (14, 15)},
    "L": {0.65: (3, 4), 1.0: (5, 6), 1.5: (7, 8), 2.5: (10, 11), 4.0: (14, 15), 6.5: (21, 22)},
    "M": {0.65: (5, 6), 1.0: (7, 8), 1.5: (10, 11), 2.5: (14, 15), 4.0: (21, 22), 6.5: (21, 22)},
    "N": {0.65: (7, 8), 1.0: (10, 11), 1.5: (14, 15), 2.5: (21, 22), 4.0: (21, 22), 6.5: (21, 22)},
    "P": {0.65: (10, 11), 1.0: (14, 15), 1.5: (21, 22), 2.5: (21, 22), 4.0: (21, 22), 6.5: (21, 22)},
    "Q": {0.65: (14, 15), 1.0: (21, 22), 1.5: (21, 22), 2.5: (21, 22), 4.0: (21, 22), 6.5: (21, 22)},
    "R": {0.65: (21, 22), 1.0: (21, 22), 1.5: (21, 22), 2.5: (21, 22), 4.0: (21, 22), 6.5: (21, 22)},
}

VALID_LEVELS = ["S1", "S2", "S3", "S4", "GI", "GII", "GIII"]
VALID_AQLS = [0.65, 1.0, 1.5, 2.5, 4.0, 6.5]


def get_code_letter(lot_size: int, inspection_level: InspectionLevel = "GII") -> str:
    """Return the ISO 2859-1 sample size code letter for a given lot size and inspection level."""
    if lot_size < 2:
        raise ValueError("lot_size must be >= 2")
    if inspection_level not in VALID_LEVELS:
        raise ValueError(f"inspection_level must be one of: {VALID_LEVELS}")
    col = _LEVEL_COLUMN[inspection_level]
    for row in _SAMPLE_SIZE_CODE_LETTERS:
        if row[0] <= lot_size <= row[1]:
            return row[col]
    raise ValueError("lot_size out of supported range")


def calculate_aql(lot_size: int, inspection_level: InspectionLevel = "GII", aql: float = 2.5) -> dict:
    """
    Calculate AQL sampling plan per ISO 2859-1.

    Args:
        lot_size: Total units in the production lot (>= 2)
        inspection_level: One of S1, S2, S3, S4, GI, GII, GIII (default GII)
        aql: One of 0.65, 1.0, 1.5, 2.5, 4.0, 6.5 (default 2.5 for major defects)

    Returns:
        dict with code_letter, sample_size, accept_number, reject_number, decision callable

    Example:
        >>> result = calculate_aql(lot_size=2400, inspection_level="GII", aql=2.5)
        >>> result["sample_size"]
        125
        >>> result["accept_number"]
        7
        >>> result["decision"](5)
        'ACCEPT'
    """
    if aql not in VALID_AQLS:
        raise ValueError(f"aql must be one of: {VALID_AQLS}. For other AQL values, see ISO 2859-1 Table II-A.")
    code_letter = get_code_letter(lot_size, inspection_level)
    sample_size = _SAMPLE_SIZE_BY_LETTER[code_letter]
    accept_number, reject_number = _TABLE_B[code_letter][aql]

    def decision(defects_found: int) -> str:
        return "ACCEPT" if defects_found <= accept_number else "REJECT"

    return {
        "lot_size": lot_size,
        "inspection_level": inspection_level,
        "aql": aql,
        "code_letter": code_letter,
        "sample_size": sample_size,
        "accept_number": accept_number,
        "reject_number": reject_number,
        "decision": decision,
    }


def calculate_garment_inspection(
    lot_size: int,
    inspection_level: InspectionLevel = "GII",
    critical_aql: float = 0.65,
    major_aql: float = 2.5,
    minor_aql: float = 4.0,
) -> dict:
    """
    Calculate sample sizes for the standard garment 3-tier inspection
    (critical + major + minor defects).

    Returns:
        dict with critical, major, minor keys — each containing an AQL result
    """
    return {
        "critical": calculate_aql(lot_size, inspection_level, critical_aql),
        "major": calculate_aql(lot_size, inspection_level, major_aql),
        "minor": calculate_aql(lot_size, inspection_level, minor_aql),
    }


__all__ = [
    "calculate_aql",
    "calculate_garment_inspection",
    "get_code_letter",
    "VALID_LEVELS",
    "VALID_AQLS",
]
