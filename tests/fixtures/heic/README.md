# Original HEIC fixtures

These synthetic red/blue images were generated for Condos with `generate.py`, Pillow 13.0.0 and pillow-heif 1.8.1 (HEVC encoding through libheif). They contain no photographed person, property or real location. The fixtures and generator are dedicated to the public domain under CC0-1.0: https://creativecommons.org/publicdomain/zero/1.0/ . No third-party photographs were copied.

Generate with these optional Python packages installed, then run `python generate.py`. They are fixture-generation tools, not application or test-runtime dependencies. The generator passes EXIF **bytes** so libheif also writes real HEIF rotation/mirror transformations; an EXIF object alone would not test those transformations.

- `basic.heic`: 64×32, red left and blue right; remains 64×32 (no upscaling).
- `rotated-gps.heic`: encoded 2400×1200 with orientation 6 (90° clockwise); displayed 1200×2400, red top and blue bottom; JPEG result 800×1600.
- `mirrored.heic`: encoded 80×40 with orientation 2 (horizontal mirror); displayed blue left/red right and remains 80×40.

All contain synthetic GPS N13°45′ E100°30′ and the XMP marker `SYNTHETIC-GPS-METADATA`. Independent browser assertions check dimensions, opposite corner colors and absence of EXIF/XMP in the JPEG output. Native HEIC decoding is unavailable in the tested Chromium, proving the fallback is real. The fixtures are real HEVC/HEIF bytes, not renamed JPEGs.
