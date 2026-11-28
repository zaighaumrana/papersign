# PaperSign implementation blueprint

## Product principles
1. **Local first:** document bytes remain on the user's device by default.
2. **No account gate for basic signing:** opening, previewing, signing, and exporting remain available without registration.
3. **Explicit network boundaries:** future cloud features must explain what data leaves the device and require affirmative action.
4. **Honest signature language:** a handwritten signature image is a visual mark, not a cryptographic digital signature.
5. **Progressive freemium:** paid features must not compromise basic local signing.

## Current milestone: v0.2 Document Workspace
- Select and validate a PDF locally.
- Render every page using PDF.js.
- Jump to pages and adjust preview zoom.
- Draw a signature once and add placements to any page.
- Drag a placement and resize it with its corner handle.
- Remove an individual placement.
- Export all placements into the corresponding original PDF pages using pdf-lib.
- Keep the source PDF unchanged and download a separate signed copy.
- Keep document processing in the browser.

## Known limitations
- All page proxies are loaded for the document; very large PDFs may consume substantial memory.
- No thumbnails, virtualized rendering, or lazy page loading yet.
- No undo/redo history or keyboard placement controls.
- No signature image import, typed signatures, background cleanup, or saved local profiles.
- No authentication, billing, email delivery, server-side document storage, or certificate signing.

## Next milestones
### Signature studio
- Draw, type, or import a signature.
- Add transparent-background cleanup for imported images.
- Offer undo/clear controls.
- Keep signature assets local unless the user explicitly saves a local profile.

### Local workspace and history
- Use IndexedDB through Dexie for opt-in local profiles and recent-document metadata.
- Do not persist original PDF bytes by default without clear consent.
- Provide controls for removing local data.

### Freemium accounts
- Keep basic signing account-free.
- Add optional authentication and entitlement checks for paid features.
- Store account and subscription metadata separately from document contents.
- Never upload a PDF merely to check authentication or feature entitlement.

### Optional delivery services
- Add explicit user-triggered email delivery.
- Explain that sending a document transmits it to the selected provider.
- Keep a clear confirmation step and delivery record.

## Architecture boundaries
- **UI:** React components and feature-focused modules.
- **PDF rendering:** PDF.js, isolated from editing/export logic.
- **PDF operations:** pdf-lib for writing signature images into the original document.
- **Signature capture:** signature_pad.
- **Local persistence:** Dexie/IndexedDB only for explicit local-save workflows.
- **Validation:** validate untrusted files and handle malformed, encrypted, or oversized PDFs.
- **Backend:** optional account, entitlement, billing, and delivery endpoints only.

## Security and privacy requirements
- Treat uploaded PDFs and image files as untrusted input.
- Avoid logging document contents, signatures, or personal data.
- Release PDF.js rendering resources and object URLs after use.
- Keep secrets out of browser bundles and repository files.
- Explain exactly when future features transmit document data.

## Engineering checks
- TypeScript typecheck passes.
- Oxlint passes.
- Production Vite build passes.
- Unit tests cover placement coordinate conversion and PDF service behavior.
- Browser tests cover upload, page rendering, placement, export, and failure states.
- Privacy copy matches actual network behavior.
