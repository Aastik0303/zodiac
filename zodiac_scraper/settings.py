import os

BOT_NAME = "zodiac_character_scraper"
SPIDER_MODULES = ["zodiac_scraper.spiders"]
NEWSPIDER_MODULE = "zodiac_scraper.spiders"
ROBOTSTXT_OBEY = True
CONCURRENT_REQUESTS = 2
CONCURRENT_REQUESTS_PER_DOMAIN = 1
DOWNLOAD_DELAY = 1.0
DOWNLOAD_TIMEOUT = 30
RETRY_ENABLED = True
RETRY_TIMES = 2
HTTPCACHE_ENABLED = True
HTTPCACHE_EXPIRATION_SECS = 86400
HTTPCACHE_DIR = "data/.httpcache"
USER_AGENT = os.getenv("SCRAPER_USER_AGENT", "ZodiacCharacterMatcherBot/1.0 (local project; contact not provided) Scrapy")
DEFAULT_REQUEST_HEADERS = {"Accept": "application/json"}
ITEM_PIPELINES = {"zodiac_scraper.pipelines.CharacterValidationPipeline": 100}
LOG_LEVEL = "INFO"
FEED_EXPORT_ENCODING = "utf-8"
