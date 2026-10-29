from datetime import date, datetime
from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator


ZodiacSign = Literal[
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]


class Character(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    character_id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    aliases: list[str] = Field(default_factory=list)
    universe: str = Field(min_length=1)
    franchise: str | None = None
    character_type: str | None = None
    species: str | None = None
    gender: str | None = None
    birth_date: date | None = None
    zodiac_sign: ZodiacSign | None = None
    personality_traits: list[str] = Field(default_factory=list)
    description: str | None = None
    image_url: str | None = None
    image_local_path: str | None = None
    source_name: str | None = None
    source_url: str | None = None
    image_license: str | None = None
    attribution: str | None = None
    last_updated: datetime | None = None

    @field_validator("image_url", "source_url")
    @classmethod
    def validate_http_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("URL must be absolute HTTP or HTTPS")
        return value

    @field_validator("aliases", "personality_traits")
    @classmethod
    def clean_lists(cls, values: list[str]) -> list[str]:
        return [" ".join(value.split()) for value in values if value.strip()]
