#!/usr/bin/env python3
"""Validate JSON-LD structured data across the site.

Run from the repo root: python3 scripts/validate-schema.py [file.html ...]
With no arguments it checks every *.html file. Exits non-zero on errors.

Checks:
- every application/ld+json block parses as JSON
- Product: name, image, offers with price and priceCurrency
- Article/BlogPosting: headline, image, datePublished, author.name, publisher.logo
- FAQPage: every Question has a name and a non-empty acceptedAnswer.text
- no .html or http:// URLs in any schema string
- required page metadata: og:site_name, canonical
"""
import glob
import json
import re
import sys

SITE = "https://www.sensawellness.org"


def walk_strings(node):
    if isinstance(node, dict):
        for v in node.values():
            yield from walk_strings(v)
    elif isinstance(node, list):
        for v in node:
            yield from walk_strings(v)
    elif isinstance(node, str):
        yield node


def check_block(path, data, problems):
    types = data.get("@type", "")
    types = [types] if isinstance(types, str) else types

    for s in walk_strings(data):
        if s.startswith("http://"):
            problems.append(f"{path}: non-https URL in schema: {s}")
        if s.startswith(SITE) and s.endswith(".html"):
            problems.append(f"{path}: .html URL in schema (site uses clean URLs): {s}")

    if "Product" in types:
        for field in ("name", "image", "offers"):
            if field not in data:
                problems.append(f"{path}: Product missing required field '{field}'")
        offers = data.get("offers", [])
        offers = [offers] if isinstance(offers, dict) else offers
        for o in offers:
            for field in ("price", "priceCurrency"):
                if field not in o:
                    problems.append(f"{path}: Offer missing '{field}'")

    if "Article" in types or "BlogPosting" in types:
        for field in ("headline", "image", "datePublished"):
            if field not in data:
                problems.append(f"{path}: Article missing '{field}'")
        if not data.get("author", {}).get("name"):
            problems.append(f"{path}: Article author has no name")
        if not data.get("publisher", {}).get("logo"):
            problems.append(f"{path}: Article publisher has no logo")

    if "FAQPage" in types:
        for q in data.get("mainEntity", []):
            if not q.get("name"):
                problems.append(f"{path}: FAQ question missing name")
            if not q.get("acceptedAnswer", {}).get("text", "").strip():
                problems.append(f"{path}: FAQ answer empty for '{q.get('name', '?')}'")


def check_index_drift(problems):
    """New posts must appear in sitemap.xml, blog.html, and llms.txt."""
    disk = {p[:-5] for p in glob.glob("post-*.html")}
    for name, source, pattern in (
        ("sitemap.xml", open("sitemap.xml").read(), r"sensawellness\.org/(post-[a-z0-9-]+)"),
        ("blog.html", open("blog.html").read(), r'href="/(post-[a-z0-9-]+)"'),
        ("llms.txt", open("llms.txt").read(), r"sensawellness\.org/(post-[a-z0-9-]+)"),
    ):
        listed = set(re.findall(pattern, source))
        for slug in sorted(disk - listed):
            problems.append(f"{name}: missing {slug}")
        for slug in sorted(listed - disk):
            problems.append(f"{name}: links non-existent {slug}")


def main():
    files = sys.argv[1:] or sorted(glob.glob("*.html"))
    internal = {"admin.html", "chat.html", "deck.html", "success.html", "cuvet-animation.html"}
    problems = []
    blocks = 0
    for path in files:
        src = open(path, encoding="utf-8").read()
        for m in re.finditer(r'<script type="application/ld\+json"[^>]*>(.*?)</script>', src, re.S):
            body = m.group(1).strip()
            if not body:
                continue
            blocks += 1
            try:
                data = json.loads(body)
            except Exception as e:
                problems.append(f"{path}: JSON parse error: {e}")
                continue
            check_block(path, data, problems)
        if path not in internal:
            if 'property="og:site_name"' not in src:
                problems.append(f"{path}: missing og:site_name meta")
            if 'rel="canonical"' not in src:
                problems.append(f"{path}: missing canonical link")
        if '"FAQPage"' in src and path.startswith("post-") and 'class="post-faq"' not in src:
            problems.append(f"{path}: FAQPage schema without visible FAQ section (Google requires visible content)")

    if not sys.argv[1:]:
        check_index_drift(problems)

    print(f"checked {len(files)} files, {blocks} JSON-LD blocks")
    if problems:
        print(f"\n{len(problems)} problem(s):")
        for p in problems:
            print(" -", p)
        sys.exit(1)
    print("all clean")


if __name__ == "__main__":
    main()
