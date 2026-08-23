#!/usr/bin/env python3
"""Ping IndexNow (Bing and partner engines) with new or changed URLs.

Usage:
  python3 scripts/indexnow-ping.py /post-new-slug /blog ...   # clean paths or full URLs

Run after every publish. Bing's index feeds ChatGPT search and Copilot
retrieval, and IndexNow-submitted URLs get crawled far faster than
waiting for sitemap polling. The key file <key>.txt is served from the
site root and must stay deployed.
"""
import json
import sys
import urllib.request

HOST = "www.sensawellness.org"
KEY = "470d5416fd7d16685b3e90db5c8a86d4"

def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    urls = []
    for a in sys.argv[1:]:
        if a.startswith("http"):
            urls.append(a)
        else:
            urls.append("https://%s/%s" % (HOST, a.lstrip("/")))
    body = json.dumps({
        "host": HOST,
        "key": KEY,
        "keyLocation": "https://%s/%s.txt" % (HOST, KEY),
        "urlList": urls,
    }).encode()
    req = urllib.request.Request(
        "https://api.indexnow.org/indexnow",
        data=body,
        headers={"Content-Type": "application/json; charset=utf-8"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        print("IndexNow response:", resp.status, "| submitted", len(urls), "url(s)")

if __name__ == "__main__":
    main()
