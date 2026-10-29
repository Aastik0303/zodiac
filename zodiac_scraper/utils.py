import re
import unicodedata
from datetime import date


def normalize_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = " ".join(unicodedata.normalize("NFKC", value).split())
    return cleaned or None


def normalize_key(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", value.casefold()).strip()


def zodiac_for(date_value: date) -> str:
    month_day = (date_value.month, date_value.day)
    boundaries = [
        ((1, 20), "Aquarius"), ((2, 19), "Pisces"), ((3, 21), "Aries"),
        ((4, 20), "Taurus"), ((5, 21), "Gemini"), ((6, 21), "Cancer"),
        ((7, 23), "Leo"), ((8, 23), "Virgo"), ((9, 23), "Libra"),
        ((10, 23), "Scorpio"), ((11, 22), "Sagittarius"), ((12, 22), "Capricorn"),
    ]
    for boundary, sign in reversed(boundaries):
        if month_day >= boundary:
            return sign
    return "Capricorn"
