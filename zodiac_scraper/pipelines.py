import logging

from pydantic import ValidationError

from zodiac_scraper.schemas import Character

logger = logging.getLogger(__name__)


class CharacterValidationPipeline:
    def __init__(self, crawler):
        self.crawler = crawler

    @classmethod
    def from_crawler(cls, crawler):
        return cls(crawler)

    def process_item(self, item):
        try:
            Character.model_validate({key: value for key, value in item.items() if not key.startswith("_")})
        except ValidationError as exc:
            self.crawler.stats.inc_value("characters/invalid")
            logger.warning("Invalid character record: %s (%s)", item.get("name"), exc)
            raise
        self.crawler.stats.inc_value("characters/valid")
        return item
