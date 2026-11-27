# PaperSign

Local-first PDF signature tool.

## MVP Focus

- No account required for core signing
- PDF processing happens entirely in the browser
- Signature drawing, image upload, basic cleanup, placement, and export

## Setup

```bash
cd papersign
npm install
npm run dev
```

## Project Structure

See `docs/IMPLEMENTATION_BLUEPRINT.md` (to be added) and the folder layout under `src/modules/`.

## Scripts

- `npm run dev` – development server
- `npm run build` – production build
- `npm run typecheck` – TypeScript check
- `npm run test` – unit tests (Vitest)
- `npm run test:e2e` – Playwright end-to-end tests

## Key Dependencies (MVP)

- pdfjs-dist – PDF rendering
- pdf-lib – PDF modification and export
- signature_pad – handwritten signatures
- dexie – IndexedDB for local profiles
- Tailwind CSS + basic utilities
