#!/usr/bin/env python3
"""Reprocess SlideForge logo variants.

Design: the source icon sits on a light rounded card. We preserve that look by
compositing the trimmed icon onto a light rounded-rectangle tile for header/hero
usage (matches original branding), and produce the OG card + favicons on
transparent backgrounds.
"""
from PIL import Image, ImageDraw, ImageFont

SRC = '/home/ubuntu/upload/1000097473.png'
A = 'assets/'

img = Image.open(SRC).convert('RGBA')
w, h = img.size
arr = img.load()

def is_content(px):
    r, g, b, a = px
    return not (r > 235 and g > 235 and b > 235) or a < 255

minx, miny, maxx, maxy = w, h, 0, 0
for y in range(0, h, 2):
    for x in range(0, w, 2):
        if is_content(arr[x, y]):
            minx, miny = min(minx, x), min(miny, y)
            maxx, maxy = max(maxx, x), max(maxy, y)
pad = 10
trimmed = img.crop((max(0, minx - pad), max(0, miny - pad), min(w, maxx + pad), min(h, maxy + pad)))
print('trimmed:', trimmed.size)
tw, th = trimmed.size


def light_tile(im, target_w, radius_ratio=0.22, pad=0.10):
    """Icon on a light rounded card (like the original)."""
    tile = Image.new('RGBA', (target_w, target_w), (0, 0, 0, 0))
    d = ImageDraw.Draw(tile)
    d.rounded_rectangle([0, 0, target_w - 1, target_w - 1],
                        radius=target_w * radius_ratio, fill=(250, 250, 252, 255))
    icon = im.copy()
    box = int(target_w * (1 - 2 * pad))
    icon.thumbnail((box, box), Image.LANCZOS)
    tile.paste(icon, ((target_w - icon.size[0]) // 2, (target_w - icon.size[1]) // 2), icon)
    return tile


# 1. logo.png — header (44px slot, keep at 200px for retina)
logo = light_tile(trimmed, 200)
logo.save(A + 'logo.png', optimize=True)

# 2. logo-512.png — 512px tile for hero
logo512 = light_tile(trimmed, 512, radius_ratio=0.24, pad=0.08)
logo512.save(A + 'logo-512.png', optimize=True)

# 3. og-image.png 1200x630 dark gradient + tile logo
og = Image.new('RGBA', (1200, 630))
d = ImageDraw.Draw(og)
for i in range(630):
    r = int(12 + 38 * i / 630); g = int(10 + 18 * i / 630); b = int(28 + 76 * i / 630)
    d.line([(0, i), (1200, i)], fill=(r, g, b))
lg = light_tile(trimmed, 340)
og.paste(lg, (110, (630 - lg.size[1]) // 2), lg)
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 72)
font2 = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 34)
d.text((500, 190), 'SlideForge', fill=(255, 255, 255), font=font)
d.text((500, 290), 'AI-Powered Presentation Generator', fill=(180, 190, 255), font=font2)
d.text((500, 345), 'Pure HTML + CSS + Vanilla JS', fill=(140, 150, 200), font=font2)
og.convert('RGB').save(A + 'og-image.png', optimize=True)

# 4. favicons — tile on transparent (small enough that card reads as icon)
ico = light_tile(trimmed, 256)
ico.save(A + 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128)])
for size, name in [(16, 'favicon-16.png'), (32, 'favicon-32.png'), (64, 'favicon-64.png'), (180, 'favicon-180.png')]:
    light_tile(trimmed, 256).resize((size, size), Image.LANCZOS).save(A + name, optimize=True)

print('all assets regenerated')
