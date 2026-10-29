import csv
import json
from datetime import datetime, timezone
from pathlib import Path

from pydantic import ValidationError

from zodiac_scraper.schemas import Character
from zodiac_scraper.utils import normalize_key


def load_valid_unique(raw_path: Path, report: dict) -> list[dict]:
    records = []
    ids = set()
    urls = set()
    names = set()
    with raw_path.open(encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            try:
                source = json.loads(line)
                record = Character.model_validate({key: value for key, value in source.items() if not key.startswith("_")})
            except (json.JSONDecodeError, ValidationError) as exc:
                report["errors"].append(f"Invalid record at JSONL line {line_number}: {exc}")
                report["invalid_records"] += 1
                continue
            url_key = (
                record.source_url.rstrip("/").casefold(),
                normalize_key(record.universe),
                normalize_key(record.name),
            ) if record.source_url else None
            name_key = (normalize_key(record.universe), normalize_key(record.name))
            if record.character_id in ids or (url_key and url_key in urls):
                report["duplicate_records"] += 1
                continue
            # Preserve same-name entries with separate source pages (for example, versions).
            names.add(name_key)
            ids.add(record.character_id)
            if url_key:
                urls.add(url_key)
            records.append(record.model_dump(mode="json"))
    report["same_name_version_collisions"] = max(0, len(records) - len(names))
    return records


def export_records(records: list[dict], base: Path, report: dict) -> None:
    processed = base / "data" / "processed"
    processed.mkdir(parents=True, exist_ok=True)
    (processed / "characters.json").write_text(
        json.dumps({"characters": records}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    fields = list(Character.model_fields)
    with (processed / "characters.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for record in records:
            writer.writerow({key: json.dumps(record[key], ensure_ascii=False) if isinstance(record[key], (list, dict)) else record[key] for key in fields})
    report["run_timestamp"] = datetime.now(timezone.utc).isoformat()
    report["records_collected"] = report.get("records_collected", 0)
    report["valid_unique_characters"] = len(records)
    report["records_with_images"] = sum(bool(record.get("image_url")) for record in records)
    report["records_with_downloaded_images"] = sum(bool(record.get("image_local_path")) for record in records)
    report["records_with_verified_image_licensing"] = sum(bool(record.get("image_license")) for record in records)
    report["records_with_zodiac_signs"] = sum(bool(record.get("zodiac_sign")) for record in records)
    reports = base / "data" / "reports"
    reports.mkdir(parents=True, exist_ok=True)
    (reports / "scrape_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
