# Groundwork

### Research field guide & notebook

**Understand the method. Apply it to your question. Return to the source.**

Groundwork is a source-linked research guide and an editable notebook in one self-contained HTML document. It brings explanations, practical templates and working notes into the same reading surface—without an account, server, installation or remote runtime dependency.

Its central loop is **read → apply → return**: read a chapter, attach its instructional context to a notebook field, write your own answer, and return to the exact chapter action when you need to check the explanation again.

![Groundwork desktop reading entrance](assets/screenshots/desktop.png)

## Start here

1. [Download the repository ZIP](https://github.com/Lesz-Xi/groundwork/archive/refs/heads/main.zip) and extract it, or clone the repository:
   ```sh
   git clone https://github.com/Lesz-Xi/groundwork.git
   ```
2. Open **`research-field-guide.html`** in a modern browser. `index.html` and `research-notebook.html` are byte-identical aliases of the same document.
3. Choose **Begin the guide** to read, or **Open the notebook** to work directly in the ten notebook fields.

For ordinary use, only one HTML file needs to travel. Fonts, styles, scripts, the identity mark, SVG browser icons and font-license notices are embedded. GitHub's file viewer shows HTML source; download the file and open it locally to use the guide. External source links require internet access when followed.

> **Your notes are not automatically saved.** Export them before closing, refreshing, replacing or switching copies of the document. Rebuilding the HTML does not save or migrate an open notebook.

## What is inside

| Part | Purpose |
| --- | --- |
| **21 chapters** | Questions, scope, prior art, searching, reading, assumptions, methods, measurement, causal and statistical reasoning, qualitative inquiry, formal and architecture work, ethics, reproducibility, synthesis, writing and long-arc research. |
| **134 glossary entries** | Research vocabulary with technical distinctions and plain-language orientation. |
| **16 source records** | Linked methodological guidance with an explicit account of what was actually read. |
| **Ten notebook fields** | A question, scope, prior work, method, search log, source-reading notes, claim/support ledger, ethics, synthesis and a resumable handoff. |
| **Field-kit templates** | Structured prompts to copy or export—not automatically completed research records. |

The chapter/glossary text contains approximately 11,718 counted learning words. This is a broad educational foundation, not an exhaustive treatment of every discipline or specialist methodological advice.

## Why one document?

Reading and applying a method are parts of one operation. Groundwork keeps the explanation and the working record together so you do not have to reconstruct the connection in a separate notes app.

It also keeps important boundaries intact:

- **Instructional context is not evidence.** Applying a chapter attaches a labeled association; it does not validate a claim or supply an answer.
- **Navigation is not progress.** Current-section indicators and bookmarks identify a place, not mastery or completed research.
- **Export is not confirmed storage.** A download request is not proof that you saved the file. Check it before confirming your copy is saved.

## Read → apply → return

1. Read a chapter and its exercise. Use **Intuition only** when you want the plain-language layer, then restore the technical detail when needed.
2. Select **Apply this chapter**. The document moves to the chapter's primary notebook field and attaches its context separately from your answer.
3. Write in the existing field. Applying or reapplying context never overwrites your text; repeated application does not duplicate the association.
4. Select **Return to chapter** to reach the exact Apply link again.
5. Use **Remove context** to remove an association without erasing your notes or other attached chapters.

Several chapters may share a field. The current context stays visible; older contexts appear in a counted disclosure. On desktop, Apply focuses the textarea. On mobile/coarse-pointer layouts, it focuses the field group rather than forcing the keyboard open.

## Save and print

- **Export notes as Markdown** preserves entered text and exports attached instructional contexts separately. Keep the HTML alongside the Markdown if you want its relative chapter links to resolve.
- Verify the downloaded file, then choose **I have saved my copy** to clear the unsaved warning. Future edits mark the notebook unsaved again.
- **Print notes only** includes all attached contexts, including folded ones. **Print all** produces the reading document with technical detail restored for print.
- Without JavaScript, the guide remains readable and chapter/related-field anchors still work. Context attachment, export and unsaved-state warnings require JavaScript; keep a separately saved record if scripts are unavailable.

Groundwork does not upload notes or implement application autosave. A bookmark stores only a section identifier when browser-local storage is available. Browser form/session restoration is outside the document's control. The file is **not a secure vault**; do not put confidential research into an unsecured copy.

## Design

The interface uses a cool-grey reading surface, blue-black opening and orange notebook/action surfaces. Archivo carries headings, prose and controls; Commit Mono carries annotations, code and note fields.

A content-led hero gives way to reading without a fixed-height reservation. Desktop chapter navigation sits on the left, with a separate reading path on the right. Mobile uses native contents disclosures and a single reading column. Native scrolling, text selection, textarea resizing and visible keyboard focus remain in control.

The browser/tab icon reuses the exact pinned Groundwork SVG, embedded as a data URI so it travels with the single HTML file. The approved inverse SVG is declared for dark browser themes. SVG favicon and theme selection support depend on the browser; this does not add an installable PWA, service worker or platform-specific home-screen icons.

The visual direction is Forgis-informed, not a copy of its branding, media, scripts or commercial fonts. The Groundwork mark is original vector artwork authored in Paper and embedded from pinned SVG exports. See [DESIGN.md](DESIGN.md).

## Edit and rebuild

**Reading needs no toolchain.** Rebuilding requires Python 3 and uses only its standard library.

```sh
python3 build-standalone.py
```

The builder assembles local sources, verifies font/SVG hashes, embeds runtime assets and regenerates all three identical HTML entries. It fetches nothing.

An isolated development pilot enables only the Prior art chapter association:

```sh
python3 build-standalone.py --pilot
```

It writes `.qa/pilot.html` without replacing the main delivery. Export unsaved notes before opening a rebuilt copy.

### Repository map

```text
research-field-guide.html       Standalone guide + notebook
index.html                     Identical entry alias
research-notebook.html          Identical entry alias
build-standalone.py             Offline builder and notebook definitions
chapters-1.html / chapters-2.html  Authored chapter sources
glossary.txt / sources.json     Glossary and source-reading records
styles.css / app.js             Editable presentation and interactions
assets/                        Fonts, OFL notices and README screenshots
identity/groundwork/            Pinned SVG exports and public provenance
qa-*.py / qa-*.mjs              Structural and browser regression checks
tests/fixtures/                Frozen, empty-note preservation fixtures
verification/                  Publication verification records
```

Private drafts, experimental font intake, rejected design bundles, live user notes and browser downloads are not part of this repository. Test fixtures exist only for preservation comparisons; they are not alternative working notebooks.

## Verification

Run the builder before the structural checks:

```sh
python3 build-standalone.py
python3 qa-artifacts.py
python3 build-standalone.py --pilot
node qa-browser.mjs
node qa-browser.mjs --pilot
```

Browser QA requires **Node.js 22 or newer** with built-in `fetch`/`WebSocket`, plus a local Chrome-compatible browser. The default executable is Google Chrome's standard macOS path. On another installation, set the path explicitly:

```sh
CHROME_BIN=/path/to/chrome node qa-browser.mjs
CHROME_BIN=/path/to/chrome node qa-browser.mjs --pilot
```

The runner launches its own temporary headless browser profile and closes it afterward; it does not start an application server or require API keys. Captures and synthetic downloads stay in ignored local QA directories.

Coverage includes exact embedded SVG browser-icon bytes, emulated light/dark icon declarations and SVG rendering at 16/24/32px, internal anchors, content preservation, embedded assets, search/no-results, intuition mode, bookmarks/storage denial, Apply/return and native history, context removal, note/whitespace preservation, Markdown export, print restoration, no-JS reading, keyboard focus, reduced motion, forced-color focus and coarse-pointer arrival. Hero geometry is compared at 1440/900/390/320px widths, with separate synthetic 150% hero-text fixtures.

Tests and visual checks are **author QA**, not independent review, comprehensive accessibility certification, scientific validation or physical-device/browser certification. Safari/iOS and Firefox have not been verified. See [VERIFICATION.md](VERIFICATION.md).

## Sources and scope

Research-source checks were recorded on **8 October 2026**. Each source record states whether the material was read as full page text, selected passages, extraction or a partial PDF. Cached retrieval and a listed citation do not imply complete reading or current verification.

The guide is an educational synthesis—not a systematic review, novelty assessment, proof checker, ethics approval or guarantee of sound findings. Claims made with it remain the researcher's responsibility. The sources are available in the document and in [sources.json](sources.json).

## Rights and third-party material

Archivo and Commit Mono are distributed with their full **SIL Open Font License 1.1** notices and pinned hashes. See [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

Groundwork's original code, authored text and identity artwork are licensed under the **[MIT License](LICENSE)**. The complete copyright and permission notice is also embedded in the standalone HTML, so it travels with a single-file copy. Retain that notice when redistributing copies or substantial portions.

The font software remains under its separate SIL OFL licenses; externally referenced materials retain their respective rights. MIT licensing does not grant trademark rights. Groundwork name/trademark availability has not been independently checked.
