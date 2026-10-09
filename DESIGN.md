# Groundwork design

Groundwork is a reading and working instrument: **read → apply → return**. Its interface keeps explanations and notes close without presenting instructional context as research evidence.

## Direction and palette

The Forgis-informed visual direction adapts a flat, ruled composition to long-form reading. It does not reproduce the reference's branding, media, origin scripts or commercial fonts.

- Paper / reading surface: `#dde0e0`
- Ink / dark opening: `#122128`
- Accent / primary action and notebook: `#ff9030`
- Muted reading text: `#536167`

Archivo carries headings, body text and controls; Commit Mono carries annotations, code and note fields. Both fonts are embedded, with full OFL notices. Square controls, thin rules and surface color establish hierarchy without decorative cards, shadows or background effects.

## Reading structure

On wide screens, chapter navigation is on the left, the main reading column is central and the broader reading path is on the right. On mobile, native contents disclosures and a single column retain navigation without a separate application shell.

The opening follows its content rather than reserving a minimum height. Its existing typography, generous padding and two actions remain. Removing surplus height lets the guide enter the viewport sooner; it does not introduce a reveal or hide reading content.

The hero text action retains its light-grey underline and arrow on hover. Its resting hairline and transform-only sweep occupy the same line; generic link underlines cannot stack above it. Groundwork's home links have no hover underline, while their keyboard focus stays visible. Decorative identity marks remain stationary and non-focusable inside named native links.

## Browser identity

The browser/tab icon uses the pinned primary Groundwork SVG, with the pinned inverse variant declared for dark browser themes. Exact SVG bytes are embedded as data URIs; no sibling asset, new dependency, page-theme change, installable PWA or service worker is introduced. SVG favicon/theme-selection support and native tab caching remain browser-owned.

## Native ownership

The document owns page scrolling. Rails and textareas use bounded native overflow; there is no parallel scroller or smoothing library. Text selection, editing, vertical textarea resizing, anchors and browser history remain authoritative.

Fine-pointer hover and keyboard feedback share the existing easing. Reduced-motion and coarse-pointer behavior avoid unnecessary transitions. Forced-color mode retains system focus/line fallbacks. Browser scrollbar paint is platform-controlled, not a certified pixel-exact cross-browser treatment.

## Notebook boundaries

Apply attaches explicitly labeled instructional context to an existing field. It never inserts answers or overwrites notes. Several chapters may share a field; the current association remains visible, with earlier contexts in a counted disclosure. Return targets the exact chapter Apply action.

Notes and associations require explicit Markdown export. A saved-copy confirmation clears the unsaved warning only at the user's request. Print includes complete records and restores disclosure state afterward. No autosave, uploads, generated answers or inferred progress metrics are introduced.

## Verification boundary

The standalone file is tested in local Chrome with desktop/mobile viewport emulation, keyboard and pointer checks, structural preservation and offline runtime assertions. This is author QA, not independent accessibility, native-device, scientific or trademark certification. See [VERIFICATION.md](VERIFICATION.md).
