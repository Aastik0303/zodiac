import json
import io

from zodiac_scraper.exports import load_valid_unique


def test_deduplicates_same_page_but_preserves_character_versions():
    base = {
        "name": "Hero", "aliases": [], "universe": "Marvel", "franchise": None,
        "character_type": None, "species": None, "gender": None,
        "birth_date": None, "zodiac_sign": None, "personality_traits": [],
        "description": None, "image_url": None, "image_local_path": None,
        "source_name": "test", "image_license": None, "attribution": None,
        "last_updated": None,
    }
    rows = [
        {**base, "character_id": "wiki_1", "source_url": "https://example.org/a"},
        {**base, "character_id": "wiki_1", "source_url": "https://example.org/a"},
        {**base, "character_id": "wiki_2", "source_url": "https://example.org/b"},
    ]
    class JsonLines:
        def open(self, encoding):
            return io.StringIO("\n".join(json.dumps(row) for row in rows))

    report = {"errors": [], "duplicate_records": 0, "invalid_records": 0}
    records = load_valid_unique(JsonLines(), report)
    assert len(records) == 2
    assert report["duplicate_records"] == 1
    assert report["same_name_version_collisions"] == 1
