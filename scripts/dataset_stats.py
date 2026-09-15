"""Dataset statistics reporter for CivicTriage (Phase 1: Data Foundation).

Dynamically computes and displays statistical distributions for languages,
departments, categories, channels, lifecycle status, duplicate clusters,
and resolution durations.
"""

import sys
from collections import Counter
from pathlib import Path
import statistics

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.data.loader import load_complaints, load_taxonomy, load_gazetteer

PROCESSED_DATA_PATH = ROOT_DIR / "data" / "processed" / "complaints.csv"
TEST_DATA_PATH = ROOT_DIR / "data" / "test" / "complaints_test.csv"


def print_section(title: str):
    print("\n" + "=" * 60)
    print(f"  {title.upper()}")
    print("=" * 60)


def display_stats():
    train_records = load_complaints(PROCESSED_DATA_PATH)
    test_records = load_complaints(TEST_DATA_PATH)
    taxonomy = load_taxonomy()
    gazetteer = load_gazetteer()

    total_train = len(train_records)
    total_test = len(test_records)

    print_section("CivicTriage Dataset Summary")
    print(f"Configured Departments : {len(taxonomy['departments'])}")
    total_tax_cats = sum(len(d["categories"]) for d in taxonomy["departments"])
    print(f"Configured Categories  : {total_tax_cats}")
    print(f"Configured Localities  : {len(gazetteer['localities'])}")
    print(f"Main Training/Demo Data: {total_train} records")
    print(f"Held-Out Test Dataset  : {total_test} records")

    # --- Languages ---
    print_section("Language Distribution (Main Dataset)")
    lang_counts = Counter(r.language_ground_truth for r in train_records)
    for lang, count in lang_counts.most_common():
        pct = (count / total_train) * 100
        print(f"  {lang:<12}: {count:>4} ({pct:>5.1f}%)")

    # --- Departments ---
    print_section("Department Distribution (Main Dataset)")
    dept_counts = Counter(r.department_ground_truth for r in train_records)
    for dept, count in dept_counts.most_common():
        pct = (count / total_train) * 100
        print(f"  {dept:<20}: {count:>4} ({pct:>5.1f}%)")

    # --- Top Categories ---
    print_section("Top Categories (Main Skew Demonstration)")
    cat_counts = Counter(r.category_ground_truth for r in train_records)
    for cat, count in cat_counts.most_common(8):
        pct = (count / total_train) * 100
        print(f"  {cat:<35}: {count:>4} ({pct:>5.1f}%)")

    # --- Source Channels ---
    print_section("Source Channels (Main Dataset)")
    channel_counts = Counter(r.source_channel for r in train_records)
    for ch, count in channel_counts.most_common():
        pct = (count / total_train) * 100
        print(f"  {ch:<25}: {count:>4} ({pct:>5.1f}%)")

    # --- Operational Status ---
    print_section("Lifecycle Status & Resolutions")
    status_counts = Counter(r.status for r in train_records)
    for st, count in status_counts.most_common():
        pct = (count / total_train) * 100
        print(f"  {st:<15}: {count:>4} ({pct:>5.1f}%)")

    # Resolution times
    resolution_hours = []
    for r in train_records:
        if r.status == "Resolved" and r.resolved_at:
            delta = (r.resolved_at - r.timestamp).total_seconds() / 3600.0
            resolution_hours.append(delta)

    if resolution_hours:
        print(f"\n  Median Resolution Time : {statistics.median(resolution_hours):.1f} hours")
        print(f"  Min Resolution Time    : {min(resolution_hours):.1f} hours")
        print(f"  Max Resolution Time    : {max(resolution_hours):.1f} hours")

    # --- Duplicate Incidents & Clusters ---
    print_section("Duplicate Incidents Analysis")
    incident_groups = Counter(r.incident_id for r in train_records)
    multi_complaint_incidents = {inc: cnt for inc, cnt in incident_groups.items() if cnt > 1}
    total_duplicate_complaints = sum(multi_complaint_incidents.values())

    print(f"  Total Unique Incidents         : {len(incident_groups)}")
    print(f"  Multi-Complaint Incidents      : {len(multi_complaint_incidents)}")
    print(f"  Total Complaints in Duplicates : {total_duplicate_complaints}")
    print(f"  Largest Duplicate Group Size   : {max(multi_complaint_incidents.values()) if multi_complaint_incidents else 0}")

    # Top duplicate incidents preview
    print("\n  Sample Duplicate Groups:")
    for inc_id, count in sorted(multi_complaint_incidents.items(), key=lambda x: x[1], reverse=True)[:5]:
        sample_rec = next(r for r in train_records if r.incident_id == inc_id)
        print(f"    - Incident {inc_id} ({count} complaints): {sample_rec.category_ground_truth} in {sample_rec.locality_ground_truth} (Ward {sample_rec.ward_ground_truth})")

    # --- Held-Out Test Set Quick Stats ---
    print_section("Held-Out Test Dataset Overview")
    test_langs = Counter(r.language_ground_truth for r in test_records)
    for lang, count in test_langs.most_common():
        print(f"  {lang:<12}: {count:>3} ({count / total_test * 100:.1f}%)")
    test_depts = Counter(r.department_ground_truth for r in test_records)
    print("  Departments represented in test set: " + ", ".join(f"{d} ({c})" for d, c in test_depts.most_common()))
    print("=" * 60 + "\n")


if __name__ == "__main__":
    display_stats()
