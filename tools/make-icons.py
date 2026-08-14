"""Generate Flaggo's raster icons and the link-preview card.

Rasterises the same mark as icons/favicon.svg. Run from anywhere:
    python tools/make-icons.py

Requires Pillow. Only needs re-running if the mark or wording changes.
"""
import math
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = r"C:\laragon\www\flaggo"
OUT = os.path.join(ROOT, "icons")
os.makedirs(OUT, exist_ok=True)

INK = (44, 48, 45)
PAPER = (244, 245, 242)
SAGE = (107, 139, 122)
MUTED = (119, 124, 116)

SS = 4  # supersample factor


def draw_mark(size, bg=INK, radius_ratio=0.22):
    """Flag on a pole. Coordinates are in a 64x64 design grid."""
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    u = s / 64.0

    if bg is not None:
        d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * radius_ratio), fill=bg)

    # Pole
    d.rounded_rectangle([18.2 * u, 13 * u, 22.4 * u, 52 * u], radius=2.1 * u, fill=PAPER)

    # Banner: two sine edges sharing a phase so the cloth reads as one wave.
    x0, x1 = 22.4, 48.0
    top_y, bot_y = 17.0, 33.0
    amp = 2.6
    steps = 64

    def edge(y_base, phase):
        pts = []
        for i in range(steps + 1):
            t = i / steps
            x = x0 + (x1 - x0) * t
            y = y_base + amp * math.sin(t * math.pi * 1.9 + phase)
            pts.append((x * u, y * u))
        return pts

    top = edge(top_y, 0.0)
    bottom = edge(bot_y, 0.0)
    d.polygon(top + bottom[::-1], fill=SAGE)

    return img.resize((size, size), Image.LANCZOS)


for size in (32, 180, 192, 512):
    draw_mark(size).save(os.path.join(OUT, f"icon-{size}.png"))
    print(f"icons/icon-{size}.png")

# Maskable icons must keep their art inside the centre 80% safe zone.
mask = Image.new("RGBA", (512, 512), INK + (255,))
inner = draw_mark(370, bg=None)
mask.paste(inner, (71, 71), inner)
mask.save(os.path.join(OUT, "icon-maskable-512.png"))
print("icons/icon-maskable-512.png")


def load_font(size, bold=False):
    names = ("arialbd.ttf", "seguisb.ttf", "segoeuib.ttf") if bold else ("arial.ttf", "segoeui.ttf")
    for name in names:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


# ---------------------------------------------------------------- OG card
W, H = 1200, 630
card = Image.new("RGB", (W, H), PAPER)
d = ImageDraw.Draw(card)

title_f = load_font(104, bold=True)
sub_f = load_font(44)
modes_f = load_font(34)

title, sub, modes = "Flaggo", "Daily flag & geography games", "Flags · Globe · Map · Capitals · Tricky"

MARK = 172
GAP = 44                      # mark -> text
LINE_GAP_1, LINE_GAP_2 = 22, 20

def text_size(text, font):
    box = d.textbbox((0, 0), text, font=font)
    return box[2] - box[0], box[3] - box[1], box[1]

tw, th, t_off = text_size(title, title_f)
sw, sh, s_off = text_size(sub, sub_f)
mw, mh, m_off = text_size(modes, modes_f)

block_h = th + LINE_GAP_1 + sh + LINE_GAP_2 + mh
block_w = max(tw, sw, mw)

# Centre the mark+text group as one unit, both axes.
total_w = MARK + GAP + block_w
left = (W - total_w) // 2
top = (H - max(MARK, block_h)) // 2

mark = draw_mark(MARK)
card.paste(mark, (left, top + (max(MARK, block_h) - MARK) // 2), mark)

tx = left + MARK + GAP
ty = top + (max(MARK, block_h) - block_h) // 2

d.text((tx, ty - t_off), title, font=title_f, fill=INK)
ty += th + LINE_GAP_1
d.text((tx, ty - s_off), sub, font=sub_f, fill=MUTED)
ty += sh + LINE_GAP_2
d.text((tx, ty - m_off), modes, font=modes_f, fill=SAGE)

d.rectangle([0, H - 14, W, H], fill=SAGE)

path = os.path.join(OUT, "og-card.png")
card.save(path)
print("icons/og-card.png", os.path.getsize(path), "bytes")
