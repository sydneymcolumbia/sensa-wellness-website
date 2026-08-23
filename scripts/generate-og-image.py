#!/usr/bin/env python3
"""Generate branded 1200x630 OG images for blog posts.

Usage:
  python3 scripts/generate-og-image.py post-some-slug   # one post
  python3 scripts/generate-og-image.py --all            # every post-*.html

Reads each post's <h1> and category, renders the title on the Sensa
brand background, and writes og/<slug>.jpg. Run from the repo root.
Requires Pillow (pip install pillow). Fonts live in scripts/fonts/.
"""
import glob
import html
import os
import re
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1200, 630
INK = (16, 8, 46)
PURPLE = (114, 103, 242)
BLUE = (65, 166, 240)
WHITE = (255, 255, 255)
DIM = (255, 255, 255, 140)
FONT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts")


def font(path, size, weight=None):
    f = ImageFont.truetype(os.path.join(FONT_DIR, path), size)
    if weight is not None:
        try:
            f.set_variation_by_axes([weight])
        except Exception:
            pass
    return f


def glow(base, center, radius, color, alpha):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse(
        [center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius],
        fill=color + (alpha,),
    )
    layer = layer.filter(ImageFilter.GaussianBlur(radius / 2))
    base.alpha_composite(layer)


def background():
    img = Image.new("RGBA", (W, H), INK + (255,))
    glow(img, (1080, 40), 420, PURPLE, 70)
    glow(img, (60, 620), 360, BLUE, 45)
    d = ImageDraw.Draw(img)
    # concentric ring motif on the right, echoing the blog card artwork
    cx, cy = 1010, 315
    for r, col, a in [(150, PURPLE, 90), (100, BLUE, 70), (55, PURPLE, 110)]:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=col + (a,), width=3)
    d.ellipse([cx - 14, cy - 14, cx + 14, cy + 14], fill=PURPLE + (200,))
    return img, d


def wrap(title, fnt, max_width, draw):
    words = title.split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if draw.textlength(trial, font=fnt) <= max_width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def render(slug):
    path = slug + ".html"
    src = open(path, encoding="utf-8").read()
    m = re.search(r"<h1>(.*?)</h1>", src, re.S)
    title = html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip()
    cm = re.search(r'<span class="post-category">([^<]+)</span>', src)
    category = html.unescape(cm.group(1)).strip() if cm else "Blog"

    img, d = background()

    label = font("Quicksand.ttf", 26, 600)
    d.text((80, 74), "S E N S A   W E L L N E S S", font=label, fill=BLUE + (255,))

    # adaptive title size so long titles still fit in four lines
    max_width = 800
    for size in (68, 60, 52, 46, 40):
        tf = font("Quicksand.ttf", size, 700)
        lines = wrap(title, tf, max_width, d)
        if len(lines) <= 4:
            break
    line_h = int(size * 1.22)
    block_h = line_h * len(lines)
    y = max(150, (H - block_h) // 2 - 20)
    for line in lines:
        d.text((80, y), line, font=tf, fill=WHITE + (255,))
        y += line_h

    pill = font("Nunito.ttf", 26, 700)
    pw = d.textlength(category, font=pill)
    py = y + 26
    d.rounded_rectangle([80, py, 80 + pw + 44, py + 46], radius=23, outline=PURPLE + (220,), width=2)
    d.text((102, py + 8), category, font=pill, fill=PURPLE + (255,))

    site = font("Nunito.ttf", 26, 400)
    d.text((80, 556), "sensawellness.org", font=site, fill=DIM)

    os.makedirs("og", exist_ok=True)
    out = os.path.join("og", slug + ".jpg")
    img.convert("RGB").save(out, "JPEG", quality=82, optimize=True)
    return out


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    if sys.argv[1] == "--all":
        slugs = sorted(f[:-5] for f in glob.glob("post-*.html"))
    else:
        slugs = [s.removesuffix(".html") for s in sys.argv[1:]]
    for s in slugs:
        out = render(s)
    print("generated %d image(s), last: %s" % (len(slugs), out))


if __name__ == "__main__":
    main()
