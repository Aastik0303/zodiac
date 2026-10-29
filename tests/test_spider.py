from scrapy.http import HtmlResponse

from zodiac_scraper.spiders.wikimedia_characters import WikimediaCharactersSpider


def test_extracts_character_heading_and_description_from_local_html():
    body = b"""<html><h1>List</h1><div class='mw-parser-output'>
    <h2>Test Hero</h2><p>Test Hero is a fictional character from this universe.</p>
    <h2>Test Villain</h2><p>Another fictional character.</p></div></html>"""
    response = HtmlResponse(url="https://en.wikipedia.org/wiki/List", body=body, encoding="utf-8")
    spider = WikimediaCharactersSpider(per_universe=1)
    items = list(spider.parse_list(response, "marvel", "Marvel", "Marvel Comics", "headings"))
    assert len(items) == 1
    assert items[0]["name"] == "Test Hero"
    assert items[0]["description"] == "Test Hero is a fictional character from this universe."


def test_extracts_character_from_labeled_table():
    body = b"""<div class='mw-parser-output'><table>
    <tr><th>Character</th><th>Portrayed by</th></tr>
    <tr><td><a href='/wiki/Test_Hero' title='Test Hero'>Test Hero</a></td><td>Actor Name</td></tr>
    </table></div>"""
    response = HtmlResponse(url="https://en.wikipedia.org/wiki/List", body=body, encoding="utf-8")
    spider = WikimediaCharactersSpider(per_universe=1)
    items = list(spider.parse_list(response, "game_of_thrones", "Hollywood television", "Test series", "table"))
    assert len(items) == 1
    assert items[0]["name"] == "Test Hero"


def test_missing_table_character_column_produces_no_records():
    body = b"<div class='mw-parser-output'><table><tr><th>Actor</th></tr><tr><td>Actor Name</td></tr></table></div>"
    response = HtmlResponse(url="https://en.wikipedia.org/wiki/List", body=body, encoding="utf-8")
    spider = WikimediaCharactersSpider(per_universe=1)
    assert list(spider.parse_list(response, "disney", "Disney", "Disney", "table")) == []
