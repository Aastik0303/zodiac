import re
from datetime import datetime, timezone
from urllib.parse import quote, unquote, urljoin, urlparse

import scrapy

from zodiac_scraper.utils import normalize_key


SOURCES = {
    "marvel": ("Marvel", "Marvel Comics", "https://en.wikipedia.org/wiki/List_of_Marvel_Comics_characters:_A", "headings"),
    "dc": ("DC Comics", "DC Comics", "https://en.wikipedia.org/wiki/List_of_DC_Comics_characters:_A", "headings"),
    "harry_potter": ("Harry Potter", "Harry Potter", "https://en.wikipedia.org/wiki/List_of_Harry_Potter_characters", "bullets"),
    "disney": ("Disney", "Disney villains", "https://en.wikipedia.org/wiki/List_of_Disney_villain_characters", "table"),
    "naruto": ("Anime", "Naruto", "https://en.wikipedia.org/wiki/List_of_Naruto_characters", "headings"),
    "dragon_ball": ("Anime", "Dragon Ball", "https://en.wikipedia.org/wiki/List_of_Dragon_Ball_characters", "headings"),
    "star_wars": ("Hollywood films", "Star Wars original trilogy", "https://en.wikipedia.org/wiki/List_of_Star_Wars_original_trilogy_characters", "headings"),
    "game_of_thrones": ("Hollywood television", "Game of Thrones", "https://en.wikipedia.org/wiki/List_of_Game_of_Thrones_characters", "table"),
}

WIKI_ROOT = "https://en.wikipedia.org"
EXCLUDED_TITLES = re.compile(r"\b(list of|overview|concept and design|secondary characters|locations|alderaan|naruto shipp|other pirates|straw hats|pirates|worldwide groups|world government|baroque works|main characters|main cast|other notable characters|supporting characters|background|antagonists|creation and conception|characters by|four emperors|guest cast|recurring cast|villains tonight|halloween party|fantasmic|volume|episode|season|franchise|film series|cursed child|tales of beedle|house of villains)\b", re.IGNORECASE)


def _clean_url(url: str) -> str:
    parts = urlparse(url)
    return f"{parts.scheme}://{parts.netloc}{parts.path}"


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", normalize_key(value)).strip("_")


class WikimediaCharactersSpider(scrapy.Spider):
    name = "wikimedia_characters"
    allowed_domains = ["en.wikipedia.org"]

    def __init__(self, per_universe=15, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.per_universe = max(1, int(per_universe))
        self.counts = {key: 0 for key in SOURCES}
        self.seen = {key: set() for key in SOURCES}

    async def start(self):
        for key, (universe, franchise, url, mode) in SOURCES.items():
            yield scrapy.Request(
                url, callback=self.parse_list,
                cb_kwargs={"key": key, "universe": universe, "franchise": franchise, "mode": mode},
            )

    def parse_list(self, response, key, universe, franchise, mode):
        if mode == "headings":
            for heading in response.css(".mw-parser-output h2, .mw-parser-output h3, .mw-parser-output h4"):
                name = " ".join(heading.xpath("string(.)").get(default="").split())
                name = re.sub(r"\s*\[edit\]$", "", name)
                if name:
                    paragraphs = []
                    for sibling in heading.xpath("following-sibling::*"):
                        if sibling.root.tag in {"h2", "h3", "h4", "h5"}:
                            break
                        if sibling.root.tag == "p":
                            text = " ".join(sibling.xpath("string(.)").get(default="").split())
                            if text:
                                paragraphs.append(text)
                    yield from self._make_item(key, universe, franchise, name, " ".join(paragraphs) or None, response.url)
        elif mode == "bullets":
            rows = response.xpath("//*[self::h2 or self::h3][contains(., 'Characters by surname')]/following::li")
            for row in rows:
                anchor = row.xpath(".//a[@href][1]")
                name = anchor.attrib.get("title") if anchor else None
                if not name:
                    continue
                description = " ".join(row.xpath(".//text()[not(ancestor::style or ancestor::script)]").getall())
                description = re.sub(r"\[\d+\]", "", " ".join(description.split()))
                name = description.split("–", 1)[0].split("—", 1)[0].strip()
                if "," in name:
                    surname, given_name = (part.strip() for part in name.split(",", 1))
                    name = f"{given_name} {surname}"
                yield from self._make_item(key, universe, franchise, name, description, response.url)
        elif mode == "table":
            for table in response.css(".mw-parser-output table"):
                headers = [" ".join(cell.xpath("string(.)").get(default="").split()).casefold() for cell in table.css("tr:first-child th")]
                index = next((i for i, value in enumerate(headers) if value in {"character", "character name", "fictional character"}), None)
                if index is None:
                    continue
                for row in table.css("tr"):
                    cells = row.css("th, td")
                    if len(cells) <= index or cells[index].root.tag == "th":
                        continue
                    anchor = cells[index].xpath(".//a[@href][1]")
                    name = (anchor.attrib.get("title") or " ".join(anchor.xpath(".//text()").getall()).strip()) if anchor else " ".join(cells[index].xpath("string(.)").get(default="").split())
                    if name:
                        yield from self._make_item(key, universe, franchise, name, None, response.url)

    def _make_item(self, key, universe, franchise, name, description, source_url):
        if (self.counts[key] >= self.per_universe or len(name) < 3
                or EXCLUDED_TITLES.search(name)
                or normalize_key(name).startswith("naruto shipp")
                or name.casefold() == franchise.casefold()):
            return
        normalized_name = name.split(" in other media", 1)[0].strip()
        item_id = f"{_slug(universe)}_{_slug(franchise)}_{_slug(normalized_name)}"
        if not item_id or item_id in self.seen[key]:
            return
        self.seen[key].add(item_id)
        self.counts[key] += 1
        yield {
            "character_id": item_id,
            "name": normalized_name,
            "aliases": [],
            "universe": universe,
            "franchise": franchise,
            "character_type": None,
            "species": None,
            "gender": None,
            "birth_date": None,
            "zodiac_sign": None,
            "personality_traits": [],
            "description": description[:2000] if description else None,
            "image_url": None,
            "image_local_path": None,
            "source_name": "English Wikipedia list article",
            "source_url": _clean_url(source_url),
            "image_license": None,
            "attribution": f"Wikipedia contributors; CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/; source: {_clean_url(source_url)}",
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "_commons_file_title": None,
            "_wikidata_qid": None,
            "_download_url": None,
            "_birth_date_reference": None,
            "_character_page_url": f"{WIKI_ROOT}/wiki/{quote(normalized_name.replace(' ', '_'), safe='()_,.-')}",
        }

    def errback_category(self, failure):
        self.logger.error("Wikipedia article request failed: %s", failure.request.url)
        self.crawler.stats.inc_value("sources/wikipedia/errors")
