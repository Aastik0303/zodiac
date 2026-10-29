import argparse
import json
import logging
import os
import tempfile
from pathlib import Path

import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import requests
from PIL import Image, UnidentifiedImageError

from zodiac_scraper.exports import export_records

logger = logging.getLogger(__name__)
MAX_BYTES = 8 * 1024 * 1024
USER_AGENT = os.getenv("SCRAPER_USER_AGENT", "ZodiacCharacterMatcherBot/1.0 (local project; contact not provided)")


def download_images(records: list[dict], base: Path, report: dict, limit: int = 100) -> None:
    image_dir = base / "data" / "images"
    image_dir.mkdir(parents=True, exist_ok=True)
    downloaded = 0
    report["images_missing_or_unlicensed"] = 0
    for record in records:
        if downloaded >= limit:
            break
        if not record.get("image_license") or not record.get("_download_url"):
            report["images_missing_or_unlicensed"] += 1
            continue
        try:
            import time
            if downloaded:
                time.sleep(1.0)
            with requests.get(record["_download_url"], headers={"User-Agent": USER_AGENT}, stream=True, timeout=(5, 30)) as response:
                response.raise_for_status()
                content_type = response.headers.get("Content-Type", "").split(";", 1)[0].lower()
                if not content_type.startswith("image/"):
                    raise ValueError(f"unexpected content type {content_type!r}")
                announced = int(response.headers.get("Content-Length", "0"))
                if announced > MAX_BYTES:
                    raise ValueError(f"image exceeds {MAX_BYTES} byte limit")
                with tempfile.NamedTemporaryFile(dir=image_dir, suffix=".download", delete=False) as temp_file:
                    temp_path = Path(temp_file.name)
                    size = 0
                    for chunk in response.iter_content(64 * 1024):
                        size += len(chunk)
                        if size > MAX_BYTES:
                            raise ValueError(f"image exceeds {MAX_BYTES} byte limit")
                        temp_file.write(chunk)
            with Image.open(temp_path) as image:
                image.verify()
            with Image.open(temp_path) as image:
                image.thumbnail((512, 512))
                output = image.convert("RGB") if image.mode not in {"RGB", "RGBA"} else image
                target = image_dir / f"{record['character_id']}.webp"
                output.save(target, "WEBP", quality=82, method=6)
            record["image_local_path"] = target.relative_to(base).as_posix()
            downloaded += 1
        except (requests.RequestException, OSError, ValueError, UnidentifiedImageError) as exc:
            report["errors"].append(f"Image for {record['character_id']}: {exc}")
            logger.warning("Image failed for %s: %s", record["character_id"], exc)
        finally:
            if "temp_path" in locals() and temp_path.exists():
                temp_path.unlink()
                del temp_path
    report["images_downloaded"] = sum(bool(row.get("image_local_path")) for row in records)
    raw_path = base / "data" / "raw" / "characters.jsonl"
    raw_path.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in records), encoding="utf-8")
    export_records([{key: value for key, value in row.items() if not key.startswith("_")} for row in records], base, report)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=100)
    args = parser.parse_args()
    base = Path(__file__).resolve().parents[1]
    report_path = base / "data" / "reports" / "scrape_report.json"
    report = json.loads(report_path.read_text(encoding="utf-8")) if report_path.exists() else {"errors": [], "images_missing_or_unlicensed": 0}
    report.setdefault("errors", [])
    report.setdefault("images_missing_or_unlicensed", 0)
    raw_path = base / "data" / "raw" / "characters.jsonl"
    records = [json.loads(line) for line in raw_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    download_images(records, base, report, args.limit)


if __name__ == "__main__":
    main()
