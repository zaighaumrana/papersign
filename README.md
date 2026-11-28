# PaperSign

PaperSign is a local-first PDF signing tool. Its core workflow runs in the user's browser without uploading the document to a PaperSign server.

## Current milestone: v0.2 Document Workspace
- Select and validate a PDF locally.
- Preview every page using PDF.js.
- Jump to a page and zoom the preview.
- Draw a handwritten signature once and add it to any page.
- Drag a signature placement and resize it with its corner handle.
- Add multiple placements across pages and remove individual placements.
- Export a separate PDF with every placement embedded in its selected page.

The original PDF is kept unchanged in browser memory during the session. The signed copy is generated locally and downloaded separately.

A drawn signature is a visual mark. It is not a certificate-backed cryptographic PDF digital signature and does not independently establish signer identity or document integrity.

## Technology
- React 19 + TypeScript + Vite
- PDF rendering: PDF.js (pdfjs-dist)
- PDF modification and export: pdf-lib
- Handwritten signature capture: signature_pad
- Vitest for unit tests

## Requirements
- Node.js 20.19+ or 22.12+
- npm 10+

## Local setup
~~~powershell
npm ci
npm run dev
~~~
Open the local URL printed by Vite.

## Quality checks
~~~powershell
npm run typecheck
npm run lint
npm test
npm run build
~~~

## Privacy model
- PDF parsing, page rendering, signature capture, embedding, and export happen in the browser.
- Basic signing has no account requirement and no server upload workflow.
- The document is held in browser memory while the page is open.
- Do not describe this visual signature workflow as a qualified, advanced, or certificate-backed digital-signature service.

See docs/IMPLEMENTATION_BLUEPRINT.md for the staged product and engineering plan.
