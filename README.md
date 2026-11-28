# PaperSign

PaperSign is a local-first PDF signing tool. Its core workflow is designed to run in the user's browser without uploading the document to a PaperSign server.

## Current working milestone

The current starter milestone supports:

- Selecting and validating a PDF in the browser
- Drawing a handwritten signature on a signature canvas
- Embedding that signature image on the first page, near the bottom-right corner
- Exporting a new signed PDF
- Keeping the selected PDF and signature in browser memory during the session

The current placement is intentionally fixed. Page preview, drag-to-position placement, multiple signatures, image-based signatures, signature cleanup, saved local profiles, and account features are not implemented yet.

A drawn signature is a visual mark. It is not a certificate-backed cryptographic PDF digital signature and does not independently establish signer identity or document integrity.

## Technology

- React 19 + TypeScript + Vite
- PDF modification and export: pdf-lib
- Handwritten signature capture: signature_pad
- PDF rendering dependency reserved for the upcoming document-preview milestone: pdfjs-dist
- Tailwind CSS 3
- Vitest and Playwright for future automated tests

## Requirements

- Node.js 20.19+ or 22.12+
- npm 10+

## Local setup

~~~powershell
npm install
npm run dev
~~~

Open the local URL printed by Vite.

## Quality checks

~~~powershell
npm run typecheck
npm run lint
npm run build
~~~

The repository does not yet include a committed package lockfile. The first successful npm install generates package-lock.json; commit that file so future installs can use npm ci.

## Privacy model

- PDF parsing, signature capture, embedding, and export happen in the browser.
- The current milestone has no account requirement and no server upload workflow.
- The document is held in browser memory while the page is open.
- Do not describe this visual signature workflow as a qualified, advanced, or certificate-backed digital-signature service.

## Project documentation

See the implementation blueprint in docs/IMPLEMENTATION_BLUEPRINT.md for the staged product and engineering plan.
