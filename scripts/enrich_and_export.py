import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from zodiac_scraper.enrichment import enrich_records
from zodiac_scraper.exports import export_records, load_valid_unique


def main() -> None:
    base = Path(__file__).resolve().parents[1]
    raw_path = base / "data" / "raw" / "characters.jsonl"
    report_path = base / "data" / "reports" / "scrape_report.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report = {
        "sources_attempted": ["English Wikipedia character list articles"],
        "sources": {"English Wikipedia character list articles": "queried"},
        "errors": [],
        "duplicate_records": 0,
        "invalid_records": 0,
        "image_license_rejections": 0,
        "images_downloaded": 0,
        "images_missing_or_unlicensed": 0,
    }
    try:
        enriched = enrich_records(raw_path, report)
    except Exception as exc:
        report["sources"]["Wikimedia Commons"] = "failed"
        report["errors"].append(f"Metadata enrichment failed: {exc}")
        enriched = []
    report["records_collected"] = len(enriched)
    records = load_valid_unique(raw_path, report)
    export_records(records, base, report)


if __name__ == "__main__":
    main()
