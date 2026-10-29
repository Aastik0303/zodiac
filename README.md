# Zodiac character scraper

The standalone React/Vite matcher frontend is in [`frontend/`](frontend/README.md).
It consumes `data/processed/characters.json` and keeps frontend code separate
from this Scrapy project.

This standalone Scrapy project lives in `char/` because the checked-out
repository beside it is Scrapy itself; it does not contain the Zodiac matcher
website or its schema. The adapter reads a bounded set of English Wikipedia
list and character article pages. Wikimedia's robot policy disallows `/w/` and
`/api/` for general crawlers, so this scraper does not call the Action API or
Wikidata API.

## Setup (Windows PowerShell)

```powershell
cd D:\zodiac\char
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Python 3.11 or later is required. Put a real project contact in the
`SCRAPER_USER_AGENT` environment variable before sustained collection. Sources
are configured in `zodiac_scraper/spiders/wikimedia_characters.py`: Marvel,
DC, Harry Potter, Disney villains, Naruto, One Piece, Star Wars, and Game of
Thrones. These list pages give partial coverage of the requested universes.

## Collect and export

Run a small batch first:

```powershell
python scripts/run_pipeline.py --per-universe 2
```

Collect up to 15 entries per configured list (120 maximum):

```powershell
python scripts/run_pipeline.py --per-universe 15
```

Metadata and image operations can be repeated independently:

```powershell
python -m scrapy crawl wikimedia_characters -a per_universe=15 -O data/raw/characters.jsonl
python -m scripts.enrich_and_export
python -m scripts.download_images --limit 100
```

The spider uses conservative concurrency, a per-domain delay, retries, a
request timeout, HTTP caching, and `robots.txt` compliance. It reads character
headings and explicitly labeled list rows. It keeps franchises separate so
different versions are not merged.

## Outputs

- `data/raw/characters.jsonl`: source records and internal enrichment fields.
- `data/processed/characters.json`: validated records in a `characters` array.
- `data/processed/characters.csv`: flattened data for inspection.
- `data/images/<character_id>.webp`: verified, resized thumbnails only when a
  record has a Commons image with a recognized reuse license.
- `data/reports/scrape_report.json`: source, record, image, and error counts.

List-derived descriptions retain the source page URL and CC BY-SA 4.0
attribution. Review the attribution and share-alike terms before publishing.

The enrichment step checks the matching character article and Commons file
description page for images and license data. Missing or unverified licenses
leave image URLs and paths null. The separate image downloader accepts only
records with verified URLs and a license. Images are downloaded only when
Commons reports CC0, CC BY, CC BY-SA, or a
public-domain label. The dataset records the license and available artist,
credit, and license URL. Review attribution and share-alike terms for the
website's intended use. Noncommercial and no-derivatives image licenses are
excluded. Missing licensing metadata leaves the image URL and local path null.

No birth dates are collected because the permitted article pages do not
provide a reliable structured character birth date, and the Wikidata API path
is disallowed to this crawler. Zodiac signs therefore remain null. Descriptions
and licensed images can also be missing.

## Extend or verify

Add another list adapter and universe mapping in `SOURCES` after checking the
source's API policy and content licensing. Add source-specific tests with local
fixtures; live websites are not needed for the test suite.

```powershell
python -m pytest
```

The initial dataset is a useful starter, not a reviewed character catalog.
Check source page quality and image attribution before shipping it to a
website.
