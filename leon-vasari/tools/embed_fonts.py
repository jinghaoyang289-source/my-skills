#!/usr/bin/env python3
"""Embed the page's fonts into index.html as base64 WOFF2.

Rewrites the contents of <style id="fonts">…</style> in ../index.html:
  - Inter Tight, variable 100–900 (latin)
  - Newsreader, variable 200–800, roman + italic (latin)
  - Noto Sans JP 500, subset to every CJK character on the page
  - Noto Serif SC 700, subset to the same characters
  - "Noto Sans JP Big" 800, subset to 映画の記憶, font-display:block

Run: python3 tools/embed_fonts.py   (needs network access to Google Fonts)
"""
import base64
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

HTML = Path(__file__).resolve().parent.parent / "index.html"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36")
BIG_TEXT = "映画の記憶"


def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def faces(query: str):
    """Yield (subset comment, style, weight, woff2 url) for each @font-face in a css2 response."""
    css = get("https://fonts.googleapis.com/css2?" + query).decode()
    for m in re.finditer(r"(?:/\*\s*([\w-]+)\s*\*/\s*)?@font-face\s*{([^}]*)}", css):
        body = m.group(2)
        style = re.search(r"font-style:\s*(\w+)", body).group(1)
        weight = re.search(r"font-weight:\s*([\d ]+);", body).group(1).strip()
        url = re.search(r"url\(([^)]+)\)\s*format\('woff2'\)", body).group(1)
        yield (m.group(1) or "", style, weight, url)


def rule(family, style, weight, url, display="swap"):
    data = base64.b64encode(get(url)).decode()
    return (f'@font-face{{font-family:"{family}";font-style:{style};font-weight:{weight};'
            f'font-display:{display};src:url(data:font/woff2;base64,{data}) format("woff2")}}')


def main():
    html = HTML.read_text(encoding="utf-8")
    start = html.index('<style id="fonts">') + len('<style id="fonts">')
    end = html.index("</style>", start)
    rest = html[:start] + html[end:]
    cjk = "".join(sorted({ch for ch in rest if ord(ch) >= 0x3000 and ch not in "／"}))
    text = urllib.parse.quote(cjk)
    print("CJK subset:", cjk, file=sys.stderr)

    rules = []
    for sub, style, weight, url in faces("family=Inter+Tight:wght@100..900&display=swap"):
        if sub == "latin":
            rules.append(rule("Inter Tight", style, weight, url))
    for sub, style, weight, url in faces("family=Newsreader:ital,wght@0,200..800;1,200..800&display=swap"):
        if sub == "latin":
            rules.append(rule("Newsreader", style, weight, url))
    for _, style, weight, url in faces(f"family=Noto+Sans+JP:wght@500&text={text}&display=swap"):
        rules.append(rule("Noto Sans JP", style, weight, url))
    for _, style, weight, url in faces(f"family=Noto+Serif+SC:wght@700&text={text}&display=swap"):
        rules.append(rule("Noto Serif SC", style, weight, url))
    for _, style, weight, url in faces(f"family=Noto+Sans+JP:wght@800&text={urllib.parse.quote(BIG_TEXT)}&display=block"):
        rules.append(rule("Noto Sans JP Big", style, weight, url, display="block"))

    if len(rules) != 6:
        sys.exit(f"expected 6 font faces, got {len(rules)}")
    HTML.write_text(html[:start] + "\n" + "\n".join(rules) + "\n" + html[end:], encoding="utf-8")
    print(f"embedded {len(rules)} faces into {HTML}", file=sys.stderr)


if __name__ == "__main__":
    main()
