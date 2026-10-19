# Photo formats and conversion

Photos use the same private JPEG-only upload pipeline regardless of source: at most 10 MB per source, 20 photos per offer, no upscaling, longest side at most 1600 pixels, JPEG quality 0.8, white transparency background, and no source EXIF/GPS/XMP metadata. HEIC is decoded to oriented pixels before the existing encoder runs; original HEIC bytes are never uploaded as the display asset.

HEVC-coded HEIC/HEIF still images with a valid `ftyp` container and `heic`, `heix`, `hevc` or `hevx` major/compatible brand are recognized from their bytes, including when the browser omits MIME. A filename extension alone is insufficient. Corrupt/truncated images and unsupported HEIF codecs fail with an explanation; the selection/draft and successfully saved attachments remain available. For a multi-image source, the converter uses its first decoded image as one attachment. Other codecs such as AV1/AVIF and HEIF sequences are outside the initial supported photo formats.

The pinned `heic-to` 1.6.6 decoder follows libheif 1.23.6 and runs decoding in its own Web Worker, so native browser HEIC support is not required. The codec is loaded dynamically only when a recognized HEIC is selected. The application then reuses the JPEG processing/storage limits and access rules. Browser conversion needs WebAssembly, Workers, ImageBitmap and canvas; browser/format verification results are recorded below rather than assuming every phone/browser works.

## Third-party decoder

`heic-to` and its bundled libheif decoder are LGPL-3.0-or-later components. The unmodified dependency remains a separately loaded module. Its license is shipped in [public/licenses/heic-to-LICENSE.txt](../public/licenses/heic-to-LICENSE.txt); source, version history and rebuild instructions are available from https://github.com/hoppergee/heic-to/tree/main and the exact published source archive https://registry.npmjs.org/heic-to/-/heic-to-1.6.6.tgz . Underlying libheif source: https://github.com/strukturag/libheif/tree/v1.23.6 ; bundled libde265 source: https://github.com/strukturag/libde265 . No native encoder is distributed by this app.

## Verification

Real original HEIC fixture provenance and expected rotation/mirror/privacy outcomes are in `tests/fixtures/heic/README.md`. The Chromium processing test passes actual HEIC while native `createImageBitmap(HEIC)` fails, then verifies displayable JPEG, orientation, metadata stripping and dimensions. Further browser and upload results are recorded as they are run; no untested mobile Safari guarantee is implied.
