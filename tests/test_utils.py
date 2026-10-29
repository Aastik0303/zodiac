from datetime import date

import pytest

from zodiac_scraper.utils import normalize_key, normalize_text, zodiac_for


def test_normalizes_unicode_whitespace_and_key():
    assert normalize_text("  Hermione\u00a0 Granger ") == "Hermione Granger"
    assert normalize_key("Iron-Man") == "iron man"


@pytest.mark.parametrize(("value", "sign"), [
    (date(2000, 3, 20), "Pisces"),
    (date(2000, 3, 21), "Aries"),
    (date(2000, 12, 21), "Sagittarius"),
    (date(2000, 12, 22), "Capricorn"),
])
def test_zodiac_boundary_dates(value, sign):
    assert zodiac_for(value) == sign
