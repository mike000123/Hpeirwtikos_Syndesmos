# Archive album

The feature lives only in `arxeio.html`, immediately after the existing archive hero.
Its styles and reader logic are isolated in `assets/album-reader.css` and
`assets/album-reader.js`; the homepage and existing collection markup are unchanged.

The six current SVG pages are deliberately labelled interface placeholders. They
are not scans or facsimiles of documents owned by the association. `cover-art.webp`
is AI-generated illustrative artwork derived from the approved design proposal.

When the actual album becomes available:

1. Export each page at a suitable reading resolution and put the resulting images
   in this directory. Keep any white page margins that belong to the original.
2. Replace `catalog.json`: each page needs `src` (starting with `assets/album/`),
   `title`, a factual `alt`, `width`, and `height`. Contents entries use zero-based
   `page` indices. The first image is treated as a single cover; following pages
   appear in pairs on desktop and individually on mobile.
3. Replace the decorative cover artwork with the real cover. Update the visible
   preview note, image caption and dialog description in `arxeio.html`, and update
   `provenance.json` using the book's actual publication details. Do not remove
   the preview labels while sample pages are still included.
4. Increase the catalog query version in `data-album-catalog` and use new filenames
   for replaced page images to avoid stale browser caches.

Browser validation: `python tests/album-reader.browser.py`. The script serves the
repository locally and needs Python Playwright plus Chromium. It covers desktop
spreads, mobile pages and actual touch input, zoom, contents, thumbnails, page
selection, keyboard/focus handling, fullscreen, failed images and catalog timeout.

Page-turn validation: `python tests/album-page-turn.browser.py`. It checks a full
180-degree two-sided sheet rotation, correct front/back and underlying pages,
cover transitions, actual mobile touch input, rapid navigation and interruptions.
When the operating system requests reduced motion, pages change immediately.

## Compact reader controls

The reader uses one footer toolbar. Zoom, page selection, thumbnails and contents
open as anchored popovers, without reducing the viewport height. Page sizing and
turn animations share the canvas padding measurement, so fit-to-screen remains
consistent after resizing or fullscreen changes. The surrounding archive page
and its hero are unchanged.

## Flexible interior paper

Interior turns use a 48-strip (32 on mobile) cylindrical paper surface with
matching cropped front/back images, synchronized curvature and changing light.
The bend is zero at both ends and largest midway through the turn. The first
and last catalog images are the hard covers and keep a rigid rotation. The
existing cancellation, resizing and reduced-motion paths also apply to paper.
