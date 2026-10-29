import argparse
import os
import subprocess
import sys
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Collect and export Wikimedia character metadata.")
    parser.add_argument("--per-universe", type=int, default=int(os.getenv("MAX_RECORDS_PER_UNIVERSE", "15")))
    parser.add_argument("--skip-images", action="store_true")
    parser.add_argument("--image-limit", type=int, default=100)
    args = parser.parse_args()
    base = Path(__file__).resolve().parents[1]
    (base / "data" / "raw").mkdir(parents=True, exist_ok=True)
    env = os.environ.copy()
    env["SCRAPY_SETTINGS_MODULE"] = "zodiac_scraper.settings"
    subprocess.run(
        [sys.executable, "-m", "scrapy", "crawl", "wikimedia_characters", "-a", f"per_universe={args.per_universe}", "-O", "data/raw/characters.jsonl"],
        cwd=base, env=env, check=True,
    )
    subprocess.run([sys.executable, "scripts/enrich_and_export.py"], cwd=base, env=env, check=True)
    if not args.skip_images:
        subprocess.run([sys.executable, "scripts/download_images.py", "--limit", str(args.image_limit)], cwd=base, env=env, check=True)


if __name__ == "__main__":
    main()
