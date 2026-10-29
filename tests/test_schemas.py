from datetime import date

import pytest
from pydantic import ValidationError

from zodiac_scraper.schemas import Character


def valid_record(**values):
    record = {"character_id": "wiki_1", "name": "Example", "universe": "Anime"}
    record.update(values)
    return Character.model_validate(record)


def test_missing_fields_get_nulls_or_empty_lists():
    record = valid_record()
    assert record.description is None
    assert record.birth_date is None
    assert record.aliases == []
    assert record.personality_traits == []


@pytest.mark.parametrize("url", ["file:///tmp/a", "relative/path", "https:/broken"])
def test_rejects_invalid_source_urls(url):
    with pytest.raises(ValidationError):
        valid_record(source_url=url)


def test_accepts_iso_birth_date_and_web_urls():
    record = valid_record(birth_date=date(2000, 3, 21), source_url="https://example.org/character")
    assert record.birth_date == date(2000, 3, 21)
