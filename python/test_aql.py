"""
Verification tests for garment-aql-calculator (Python).

Cross-verified against:
    - QIMA published reference (L+AQL2.5 = Accept 10)
    - ISO 2859-1:1999 Table II-A
    - Common garment QC scenarios

Run: python test_aql.py
"""

import sys
sys.path.insert(0, 'src')
from garment_aql_calculator import calculate_aql, calculate_garment_inspection, get_code_letter

passed = 0
failed = 0


def assert_equal(actual, expected, label):
    global passed, failed
    if actual == expected:
        print(f"  ✓ {label}")
        passed += 1
    else:
        print(f"  ✗ {label}")
        print(f"    expected: {expected}")
        print(f"    actual:   {actual}")
        failed += 1


def assert_throws(fn, label):
    global passed, failed
    try:
        fn()
        print(f"  ✗ {label} (expected exception, did not throw)")
        failed += 1
    except Exception:
        print(f"  ✓ {label}")
        passed += 1


print("\n=== get_code_letter (ISO 2859 Table A) ===")
assert_equal(get_code_letter(2400, "GII"), "K", "Lot 2400, GII → K")
assert_equal(get_code_letter(500, "GII"), "H", "Lot 500, GII → H")
assert_equal(get_code_letter(1200, "GII"), "J", "Lot 1200, GII → J")
assert_equal(get_code_letter(150, "GII"), "F", "Lot 150, GII → F")
assert_equal(get_code_letter(50, "GI"), "C", "Lot 50, GI → C")
assert_equal(get_code_letter(10000, "GIII"), "M", "Lot 10000, GIII → M")

print("\n=== Sample size + Accept/Reject (verified against QIMA) ===")
r = calculate_aql(lot_size=4000, inspection_level="GII", aql=2.5)
assert_equal(r["code_letter"], "L", "Lot 4000 GII → L")
assert_equal(r["sample_size"], 200, "L → sample size 200")
assert_equal(r["accept_number"], 10, "L + AQL 2.5 → accept 10 (QIMA verified)")
assert_equal(r["reject_number"], 11, "L + AQL 2.5 → reject 11")

r = calculate_aql(lot_size=2400, inspection_level="GII", aql=2.5)
assert_equal(r["code_letter"], "K", "Lot 2400 GII → K")
assert_equal(r["sample_size"], 125, "K → sample size 125")
assert_equal(r["accept_number"], 7, "K + AQL 2.5 → accept 7")
assert_equal(r["reject_number"], 8, "K + AQL 2.5 → reject 8")

r = calculate_aql(lot_size=800, inspection_level="GII", aql=2.5)
assert_equal(r["code_letter"], "J", "Lot 800 GII → J")
assert_equal(r["sample_size"], 80, "J → sample size 80")
assert_equal(r["accept_number"], 5, "J + AQL 2.5 → accept 5")

r = calculate_aql(lot_size=400, inspection_level="GII", aql=4.0)
assert_equal(r["code_letter"], "H", "Lot 400 GII → H")
assert_equal(r["sample_size"], 50, "H → sample size 50")
assert_equal(r["accept_number"], 5, "H + AQL 4.0 → accept 5")

print("\n=== Decision function ===")
r = calculate_aql(lot_size=2400, inspection_level="GII", aql=2.5)
assert_equal(r["decision"](5), "ACCEPT", "5 defects with accept=7 → ACCEPT")
assert_equal(r["decision"](7), "ACCEPT", "7 defects with accept=7 → ACCEPT (boundary)")
assert_equal(r["decision"](8), "REJECT", "8 defects with reject=8 → REJECT")
assert_equal(r["decision"](0), "ACCEPT", "0 defects → ACCEPT")

print("\n=== Full garment inspection (3-tier) ===")
inspection = calculate_garment_inspection(lot_size=2400, inspection_level="GII")
assert_equal(inspection["critical"]["sample_size"], 125, "Critical sample size 125")
assert_equal(inspection["critical"]["accept_number"], 2, "Critical AQL 0.65 → accept 2")
assert_equal(inspection["major"]["accept_number"], 7, "Major AQL 2.5 → accept 7")
assert_equal(inspection["minor"]["accept_number"], 10, "Minor AQL 4.0 → accept 10")

print("\n=== Input validation ===")
assert_throws(lambda: calculate_aql(lot_size=0), "Throws on lot_size < 2")
assert_throws(lambda: calculate_aql(lot_size=100, inspection_level="GIV"), "Throws on invalid level")
assert_throws(lambda: calculate_aql(lot_size=100, aql=5.0), "Throws on unsupported AQL")

print(f"\n{passed}/{passed + failed} tests passed." + (f" {failed} FAILED." if failed > 0 else ""))
sys.exit(1 if failed > 0 else 0)
