# PaperSign implementation blueprint

## Product principles

1. **Local first:** document bytes remain on the user's device by default.
2. **No account gate for basic signing:** opening a PDF, drawing a signature, and exporting a signed copy must remain available without registration.
3. **Explicit network boundaries:** any future cloud feature must clearly explain what data leaves the device and require an affirmative user action.
4. **Honest signature language:** an image of a handwritten signature is a visual mark, not a cryptographic digital signature.
5. **Progressive freemium:** paid features must not compromise the basic local signing workflow.

## Current milestone

The current implementation is a deliberately small vertical slice:

- PDF selection and basic validation with pdf-lib
- Page count extraction
- Signature drawing with signature_pad
- Signature image embedding on page one, bottom-right
- Local PDF export

Known limitations:

- No PDF page preview yet
- Signature placement is fixed, not draggable
- Only the first page receives a signature
- No signature image import or cleanup
- No multi-signature workflow
- No IndexedDB persistence or saved signature profiles
- No authentication, billing, email delivery, or server-side document storage
- No cryptographic certificate signing

## Planned milestones

### 1. Document workspace

- Render PDFs with PDF.js
- Add page navigation, zoom, and responsive page display
- Let users place, move, resize, and remove signature objects
- Support multiple signature placements and page selection
- Preserve the source PDF until the user explicitly exports

### 2. Signature studio

- Draw, type, or import a signature
- Provide transparent-background cleanup for imported signature images
- Offer preview and undo/clear controls
- Keep signature assets local unless the user chooses to save a local profile

### 3. Local workspace and history

- Use IndexedDB through Dexie for opt-in local profiles and recent-document metadata
- Do not persist original PDF bytes by default without clear user consent
- Provide clear controls for removing local data

### 4. Freemium accounts

- Keep basic signing account-free
- Add optional authentication and entitlement checks for paid features
- Store account and subscription metadata separately from document contents
- Never upload a PDF merely to check whether a user is signed in or entitled to a feature

### 5. Optional delivery services

- Add explicit user-triggered email delivery through a server-side service
- Explain that sending a document requires transmitting it to the selected delivery provider
- Keep a clear confirmation step and delivery record
- Do not silently email or store documents

## Architecture boundaries

- **UI:** React components and feature-focused modules
- **PDF operations:** isolated PDF service using pdf-lib
- **PDF rendering:** isolated PDF.js adapter and worker configuration
- **Signature capture:** signature_pad adapter
- **Local persistence:** Dexie/IndexedDB, introduced only for explicit local-save workflows
- **Validation:** Zod at external input boundaries where useful
- **Backend:** optional account, entitlement, billing, and delivery endpoints only; not a default document-processing dependency

## Security and privacy requirements

- Treat uploaded PDFs and image files as untrusted input.
- Validate file type and handle malformed, encrypted, or oversized files gracefully.
- Avoid logging document contents, signatures, or personal data.
- Revoke object URLs and release temporary resources after export.
- Use HTTPS for any future remote account or delivery functionality.
- Keep secrets out of browser bundles and repository files.
- Document exactly when a future feature transmits document data.

## Engineering checks

Before merging a feature:

- TypeScript typecheck passes
- Oxlint passes
- Production Vite build passes
- Unit tests cover PDF and signature service behavior
- Browser tests cover upload, signing, export, and failure states
- Privacy copy matches actual network behavior
