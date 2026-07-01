"""HTML sanitization for email bodies."""

import re

_ALLOWED_TAGS = {
    "a", "b", "blockquote", "br", "code", "div", "em", "h1", "h2", "h3", "h4",
    "i", "img", "li", "ol", "p", "pre", "span", "strong", "table", "tbody", "td",
    "th", "thead", "tr", "u", "ul",
}
_SCRIPT_PATTERN = re.compile(r"<script[^>]*>.*?</script>", re.IGNORECASE | re.DOTALL)
_STYLE_PATTERN = re.compile(r"<style[^>]*>.*?</style>", re.IGNORECASE | re.DOTALL)
_ON_EVENT_PATTERN = re.compile(r"\s+on\w+\s*=\s*[\"'][^\"']*[\"']", re.IGNORECASE)
_JAVASCRIPT_URL_PATTERN = re.compile(r"javascript:", re.IGNORECASE)


def sanitize_html(html: str | None) -> str | None:
    if not html:
        return html
    cleaned = _SCRIPT_PATTERN.sub("", html)
    cleaned = _STYLE_PATTERN.sub("", cleaned)
    cleaned = _ON_EVENT_PATTERN.sub("", cleaned)
    cleaned = _JAVASCRIPT_URL_PATTERN.sub("", cleaned)
    return cleaned


def html_to_text(html: str | None) -> str:
    if not html:
        return ""
    text = re.sub(r"<br\s*/?>", "\n", html, flags=re.IGNORECASE)
    text = re.sub(r"</p>", "\n\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()
