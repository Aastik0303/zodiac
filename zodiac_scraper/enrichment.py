import html
import json
import os
import re
import time
from urllib.parse import quote, unquote, urljoin
from pathlib import Path

import requests
from lxml import html as lxml_html
from requests.adapters import HTTPAdapter
from requests.exceptions import HTTPError
from urllib3.util.retry import Retry

USER_AGENT = os.getenv("SCRAPER_USER_AGENT", "ZodiacCharacterMatcherBot/1.0 (local project; contact not provided)")
COMMONS_FILE_URL = "https://commons.wikimedia.org/wiki/File:"
ALLOWED_LICENSES = re.compile(r"^(CC0|CC BY(?:-SA)?(?:\s|$)|Public domain)", re.IGNORECASE)
TAG_RE = re.compile(r"<[^>]+>")


def _plain(value: str | None) -> str | None:
    if not value:
        return None
    result = " ".join(html.unescape(TAG_RE.sub(" ", value)).split())
    return result or None


def _read_jsonl(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def _article_image_title(session: requests.Session, article_url: str) -> str | None:
    response = session.get(article_url, timeout=(5, 25))
    if response.status_code == 404:
        return None
    response.raise_for_status()
    document = lxml_html.fromstring(response.content)
    hrefs = document.xpath("//*[contains(@class, 'infobox')]//a[contains(@href, 'File:')]/@href")
    for href in hrefs:
        path = urljoin(article_url, href).split("/wiki/File:", 1)
        if len(path) == 2:
            return unquote(path[1].split("#", 1)[0]).replace("_", " ")
    return None


def _commons_metadata(session: requests.Session, file_title: str) -> dict | None:
    file_url = COMMONS_FILE_URL + quote(file_title.replace(" ", "_"), safe="()!,.-_")
    response = session.get(file_url, timeout=(5, 25))
    response.raise_for_status()
    document = lxml_html.fromstring(response.content)
    image_urls = document.xpath("//*[@id='file']//a[contains(@class, 'internal')]/@href")
    if not image_urls:
        return None
    license_values = document.xpath("//*[contains(@class, 'licensetpl_short')]/text()")
    license_name = _plain(" ".join(license_values))
    if not license_name or not ALLOWED_LICENSES.match(license_name):
        return {"license_rejected": True, "image_license": license_name}
    artist = _plain(" ".join(document.xpath("//*[@id='fileinfotpl_aut']/following-sibling::td//text()")))
    credit = _plain(" ".join(document.xpath("//*[@id='fileinfotpl_credit']/following-sibling::td//text()")))
    license_url = " ".join(document.xpath("//*[contains(@class, 'licensetpl_link')]/@href")) or None
    image_attribution = "; ".join(value for value in (artist, credit, license_name, license_url) if value)
    return {
        "image_url": urljoin(file_url, image_urls[0]),
        "_download_url": urljoin(file_url, image_urls[0]),
        "image_license": license_name,
        "_image_attribution": image_attribution or None,
    }


def enrich_records(path: Path, report: dict) -> list[dict]:
    records = _read_jsonl(path)
    session = requests.Session()
    session.mount("https://", HTTPAdapter(max_retries=Retry(
        total=2, connect=2, read=2, status=2, backoff_factor=1,
        status_forcelist=(429, 500, 502, 503, 504), respect_retry_after_header=True,
    )))
    session.headers.update({"User-Agent": USER_AGENT})
    session.headers.update({"Accept-Encoding": "gzip, deflate"})
    report["sources"]["Wikidata API"] = "not queried; robots.txt disallows API paths"
    report["sources"]["Wikipedia Action API"] = "not queried; robots.txt disallows /w/"

    commons_requests = 0
    article_requests = 0
    report.setdefault("images_missing_or_unlicensed", 0)
    for record in records:
        article_url = record.get("_character_page_url")
        if article_url:
            try:
                if article_requests:
                    time.sleep(1.0)
                title = _article_image_title(session, article_url)
                article_requests += 1
                record["_commons_file_title"] = title
            except requests.RequestException as exc:
                report["errors"].append(f"Article image lookup for {record['character_id']}: {exc}")
                title = None
        else:
            title = record.get("_commons_file_title")
        if title:
            try:
                if commons_requests:
                    time.sleep(1.0)
                commons_requests += 1
                image = _commons_metadata(session, title)
            except HTTPError as exc:
                if exc.response is not None and exc.response.status_code == 404:
                    report["images_missing_or_unlicensed"] += 1
                    continue
                report["errors"].append(f"Commons metadata for {title}: {exc}")
                continue
            except requests.RequestException as exc:
                report["errors"].append(f"Commons metadata for {title}: {exc}")
                continue
            if image and not image.get("license_rejected"):
                record.update(image)
                if image.get("_image_attribution"):
                    existing = record.get("attribution")
                    record["attribution"] = "; ".join(
                        value for value in (existing, image["_image_attribution"]) if value
                    )
            elif image:
                report["image_license_rejections"] += 1
    report["sources"]["English Wikipedia character articles"] = "queried" if article_requests else "no character page lookups"
    report["sources"]["Wikimedia Commons file pages"] = "queried" if commons_requests else "no Commons file pages discovered"
    if article_requests and "English Wikipedia character article pages" not in report["sources_attempted"]:
        report["sources_attempted"].append("English Wikipedia character article pages")
    if commons_requests and "Wikimedia Commons file description pages" not in report["sources_attempted"]:
        report["sources_attempted"].append("Wikimedia Commons file description pages")
    report["records_with_verified_birth_dates"] = 0
    path.write_text("".join(json.dumps(record, ensure_ascii=False) + "\n" for record in records), encoding="utf-8")
    return records
