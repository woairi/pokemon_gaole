#!/usr/bin/env python3
"""아트워크 썸네일 생성: public/sprites/artwork/*.png → public/sprites/thumb/*.webp
도감/컬렉션 그리드용 (풀사이즈 평균 132KB → 썸네일 ~10KB, 데이터 사용량 1/10).
이미 존재하는 썸네일은 건너뜀. 의존성: pip install pillow
"""
import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow가 필요해요: pip install pillow")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "public", "sprites", "artwork")
DST = os.path.join(ROOT, "public", "sprites", "thumb")
SIZE = 192  # 76px 디스크 카드 × 고해상도(2.5x) 대응

os.makedirs(DST, exist_ok=True)
made = skipped = 0
for name in sorted(os.listdir(SRC)):
    if not name.endswith(".png"):
        continue
    out = os.path.join(DST, name.replace(".png", ".webp"))
    if os.path.exists(out):
        skipped += 1
        continue
    img = Image.open(os.path.join(SRC, name)).convert("RGBA")
    img.thumbnail((SIZE, SIZE), Image.LANCZOS)
    img.save(out, "WEBP", quality=82, method=6)
    made += 1

total = sum(
    os.path.getsize(os.path.join(DST, f)) for f in os.listdir(DST) if f.endswith(".webp")
)
print(f"썸네일 {made}개 생성, {skipped}개 건너뜀 — 총 {total / 1024 / 1024:.1f}MB")
