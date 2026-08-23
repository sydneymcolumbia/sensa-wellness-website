#!/usr/bin/env python3
"""Snapshot approved customer reviews into static HTML inside index.html.

AI crawlers (GPTBot, ClaudeBot, PerplexityBot) do not execute JavaScript,
so the Firestore-backed reviews grid is invisible to them at runtime.
This script fetches the same public API the page uses and bakes the
current approved reviews into the #reviews-grid div as static HTML.
The client script still re-renders on load, so behavior is unchanged
for browsers; crawlers simply see real content instead of an empty div.

Run from the repo root after approving new reviews, then commit:
  python3 scripts/prerender-reviews.py
"""
import html
import json
import re
import urllib.request

API = "https://www.sensawellness.org/api/reviews"
FILE = "index.html"

def stars(rating):
    out = '<span class="stars rc-stars">'
    for i in range(1, 6):
        cls = ' class="star-empty"' if i > rating else ""
        out += "<span%s>★</span>" % cls
    return out + "</span>"

def card(r):
    h = '<div class="review-card">' + stars(int(r.get("rating", 5)))
    if r.get("title"):
        h += "<h4>%s</h4>" % html.escape(r["title"])
    h += "<p>%s</p>" % html.escape(r.get("body", ""))
    h += '<div class="rc-meta">%s</div>' % html.escape(r.get("firstName", "Anonymous"))
    return h + "</div>"

def main():
    with urllib.request.urlopen(API, timeout=30) as resp:
        data = json.load(resp)
    reviews = data.get("reviews", [])
    inner = "\n                ".join(card(r) for r in reviews)
    src = open(FILE, encoding="utf-8").read()
    pattern = r'(<div class="reviews-grid" id="reviews-grid" aria-live="polite">).*?(</div>)'
    new = r"\1" + ("\n                " + inner + "\n            " if inner else "") + r"\2"
    out, n = re.subn(pattern, new, src, count=1, flags=re.S)
    assert n == 1, "reviews-grid div not found"
    open(FILE, "w", encoding="utf-8").write(out)
    print("prerendered %d review(s) into %s" % (len(reviews), FILE))

if __name__ == "__main__":
    main()
