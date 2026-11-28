import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from 'react'
import { CheckCircle2, Download, FileSignature, FileText, LockKeyhole, Minus, PenLine, Plus, ShieldCheck, Trash2, Upload, ZoomIn, ZoomOut } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { PDFDocument } from 'pdf-lib'
import SignaturePad from 'signature_pad'
import { clampPlacement, getSignatureHeightRatio, toPdfImageRect } from './lib/pdf-placement'
import './App.css'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

type Placement = { id: string; pageIndex: number; x: number; y: number; width: number }
type DragState = { pointerId: number; mode: 'move' | 'resize'; startX: number; startY: number; startPlacement: Placement; pageRect: DOMRect }

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function SignaturePlacement({ placement, pageAspectRatio, imageAspectRatio, signatureData, onChange, onRemove }: {
  placement: Placement; pageAspectRatio: number; imageAspectRatio: number; signatureData: string
  onChange: (next: Placement) => void; onRemove: (id: string) => void
}) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    const pageRect = event.currentTarget.parentElement?.getBoundingClientRect()
    if (!pageRect) return
    const mode = event.target instanceof Element && event.target.closest('[data-resize-handle]') ? 'resize' : 'move'
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({ pointerId: event.pointerId, mode, startX: event.clientX, startY: event.clientY, startPlacement: placement, pageRect })
  }
  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag || drag.pointerId !== event.pointerId) return
    const dx = (event.clientX - drag.startX) / drag.pageRect.width
    const dy = (event.clientY - drag.startY) / drag.pageRect.height
    const next = drag.mode === 'resize'
      ? { ...drag.startPlacement, width: drag.startPlacement.width + dx }
      : { ...drag.startPlacement, x: drag.startPlacement.x + dx, y: drag.startPlacement.y + dy }
    onChange(clampPlacement(next, pageAspectRatio, imageAspectRatio))
  }
  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag?.pointerId === event.pointerId) setDrag(null)
  }
  return (
    <div className={'signature-placement' + (drag ? ' is-dragging' : '')}
      style={{ left: placement.x * 100 + '%', top: placement.y * 100 + '%', width: placement.width * 100 + '%' }}
      onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}
      role="group" aria-label="Placed signature. Drag to move or use the resize handle.">
      <img src={signatureData} alt="Signature preview" draggable={false} />
      <button type="button" className="placement-remove" aria-label="Remove signature from this page"
        onPointerDown={(event) => event.stopPropagation()} onClick={() => onRemove(placement.id)}><Minus size={12} /></button>
      <span className="placement-resize" data-resize-handle aria-label="Resize signature" />
    </div>
  )
}

function PdfPage({ page, pageNumber, zoom, placements, signatureData, imageAspectRatio, onAddSignature, onChangePlacement, onRemovePlacement }: {
  page: PDFPageProxy; pageNumber: number; zoom: number; placements: Placement[]; signatureData: string; imageAspectRatio: number
  onAddSignature: (pageIndex: number, pageWidth: number, pageHeight: number) => void
  onChangePlacement: (placement: Placement) => void; onRemovePlacement: (id: string) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [aspectRatio, setAspectRatio] = useState(1 / 1.414)
  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const base = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: Math.min(1.35, 860 / base.width) * zoom })
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    setAspectRatio(viewport.width / viewport.height)
    const task = page.render({ canvasContext: context, viewport })
    task.promise.catch((cause: unknown) => {
      if (!(cause instanceof Error) || cause.name !== 'RenderingCancelledException') console.error('PDF page rendering failed', cause)
    })
    return () => task.cancel()
  }, [page, zoom])
  const base = page.getViewport({ scale: 1 })
  return (
    <article className="pdf-page-card" id={'pdf-page-' + pageNumber}>
      <div className="pdf-page-heading"><span>Page {pageNumber}</span>
        <button type="button" className="add-signature-button" onClick={() => onAddSignature(pageNumber - 1, base.width, base.height)} disabled={!signatureData}>
          <Plus size={14} /> Add signature
        </button>
      </div>
      <div className="pdf-page-stage">
        <div className="page-canvas-wrap" style={{ aspectRatio }}>
          <canvas ref={canvasRef} aria-label={'PDF page ' + pageNumber + ' preview'} />
          {placements.map((item) => <SignaturePlacement key={item.id} placement={item} pageAspectRatio={base.width / base.height}
            imageAspectRatio={imageAspectRatio} signatureData={signatureData} onChange={onChangePlacement} onRemove={onRemovePlacement} />)}
        </div>
      </div>
    </article>
  )
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const signaturePadRef = useRef<SignaturePad | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null)
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null)
  const [pages, setPages] = useState<PDFPageProxy[]>([])
  const [placements, setPlacements] = useState<Placement[]>([])
  const [hasSignature, setHasSignature] = useState(false)
  const [signatureData, setSignatureData] = useState('')
  const [imageAspectRatio, setImageAspectRatio] = useState(3)
  const [zoom, setZoom] = useState(1)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Choose a PDF to open your signing workspace.')
  const [error, setError] = useState('')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const pad = new SignaturePad(canvas, { minWidth: 0.8, maxWidth: 2.4, penColor: '#211b1c' })
    const syncSignature = () => {
      if (pad.isEmpty()) return
      setHasSignature(true)
      setSignatureData(pad.toDataURL('image/png'))
      setImageAspectRatio(canvas.width / canvas.height)
    }
    pad.addEventListener('endStroke', syncSignature)
    signaturePadRef.current = pad
    const resize = () => {
      const data = pad.toData()
      const bounds = canvas.getBoundingClientRect()
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      canvas.width = Math.round(bounds.width * ratio)
      canvas.height = Math.round(bounds.height * ratio)
      canvas.getContext('2d')?.setTransform(ratio, 0, 0, ratio, 0, 0)
      pad.clear()
      if (data.length) pad.fromData(data)
      setHasSignature(data.length > 0)
      if (data.length) syncSignature()
    }
    resize()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      pad.off()
      signaturePadRef.current = null
    }
  }, [])

  useEffect(() => () => { void pdfDocument?.destroy() }, [pdfDocument])

  const handlePdfUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(''); setBusy(true); setMessage('Opening and rendering your PDF…')
    setPlacements([]); setPages([]); setPdfDocument(null)
    try {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) throw new Error('Please choose a PDF file.')
      const bytes = new Uint8Array(await file.arrayBuffer())
      const validated = await PDFDocument.load(bytes)
      if (!validated.getPageCount()) throw new Error('This PDF does not contain any pages.')
      const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() })
      const documentProxy = await loadingTask.promise
      const loadedPages = await Promise.all(Array.from({ length: documentProxy.numPages }, (_, i) => documentProxy.getPage(i + 1)))
      setPdfBytes(bytes); setPdfFile(file); setPdfDocument(documentProxy); setPages(loadedPages)
      setMessage('PDF ready. ' + loadedPages.length + ' pages loaded. Draw a signature, then add it to a page.')
    } catch (cause) {
      setPdfBytes(null); setPdfFile(null); setPdfDocument(null); setPages([])
      setError(cause instanceof Error ? cause.message : 'We could not read this PDF.')
      setMessage('Choose another PDF to continue.')
    } finally { setBusy(false) }
  }

  const clearSignature = () => {
    signaturePadRef.current?.clear()
    setHasSignature(false); setSignatureData(''); setPlacements([])
  }

  const addSignatureToPage = (pageIndex: number, pageWidth: number, pageHeight: number) => {
    if (!signatureData) return
    const width = 0.28
    const aspect = pageWidth / pageHeight
    const height = getSignatureHeightRatio(width, aspect, imageAspectRatio)
    const item: Placement = { id: crypto.randomUUID(), pageIndex, x: 0.66, y: Math.max(0.04, 0.78 - height), width }
    setPlacements((current) => [...current, clampPlacement(item, aspect, imageAspectRatio)])
    setMessage('Signature added to page ' + (pageIndex + 1) + '. Drag it to position and use its corner handle to resize.')
  }

  const updatePlacement = (next: Placement) => {
    const page = pages[next.pageIndex]
    if (!page) return
    const view = page.getViewport({ scale: 1 })
    setPlacements((current) => current.map((item) => item.id === next.id ? clampPlacement(next, view.width / view.height, imageAspectRatio) : item))
  }

  const goToPage = (number: number) => document.getElementById('pdf-page-' + number)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const exportSignedPdf = async () => {
    if (!pdfBytes || !signatureData || !placements.length) {
      setError('Draw a signature and add it to at least one page before exporting.')
      return
    }
    setBusy(true); setError(''); setMessage('Preparing your signed PDF…')
    try {
      const output = await PDFDocument.load(pdfBytes)
      const image = await output.embedPng(signatureData)
      const outputPages = output.getPages()
      for (const item of placements) {
        const page = outputPages[item.pageIndex]
        if (page) page.drawImage(image, toPdfImageRect(item, page.getWidth(), page.getHeight(), imageAspectRatio))
      }
      const bytes = await output.save()
      const copy = new Uint8Array(bytes.length); copy.set(bytes)
      const url = URL.createObjectURL(new Blob([copy.buffer], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.download = (pdfFile?.name.replace(/\.pdf$/i, '') || 'document') + '-signed.pdf'
      document.body.appendChild(link); link.click(); link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1500)
      setMessage('Signed PDF downloaded with ' + placements.length + ' signature ' + (placements.length === 1 ? 'placement.' : 'placements.'))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The PDF could not be exported.')
      setMessage('Export did not complete. Please try again.')
    } finally { setBusy(false) }
  }

  return (
    <main className="app-shell app-shell-wide">
      <header className="topbar">
        <a className="brand" href="/" aria-label="PaperSign home"><span className="brand-mark"><FileSignature size={22} strokeWidth={1.8} /></span><span>Paper<span>Sign</span></span></a>
        <div className="privacy-note"><LockKeyhole size={15} /> Private by design</div>
      </header>
      <section className="intro intro-compact">
        <div className="eyebrow"><span /> PAPERSIGN 0.2 · DOCUMENT WORKSPACE</div>
        <h1>Your document.<br /><em>Your signature. Your place.</em></h1>
        <p>Preview every page, place your signature where it belongs, and export a copy. Your PDF stays on this device.</p>
      </section>
      <section className="workspace workspace-wide" aria-label="PDF signing workspace">
        <div className="workspace-topline">
          <div className="step-heading"><span className="step-number">01</span><div><h2>Open your document</h2><p>Choose a PDF to preview all its pages.</p></div></div>
          <label className="primary-upload-button"><Upload size={16} /> {pdfFile ? 'Choose another PDF' : 'Choose PDF'}
            <input type="file" accept="application/pdf,.pdf" onChange={handlePdfUpload} disabled={busy} />
          </label>
        </div>
        {pdfFile && <div className="document-meta"><FileText size={17} /><div><strong>{pdfFile.name}</strong><small>{formatFileSize(pdfFile.size)} · {pages.length} pages</small></div><CheckCircle2 size={18} className="success-icon" /></div>}
        <div className="signature-studio">
          <div className="studio-copy">
            <div className="step-heading"><span className="step-number">02</span><div><h2>Create your signature</h2><p>Draw once, then place it on any page.</p></div></div>
            <p className="studio-hint">Your signature stays in this browser session. Add it to as many pages as you need.</p>
          </div>
          <div className="signature-card">
            <div className="signature-toolbar"><span><PenLine size={15} /> Signature canvas</span>
              <button type="button" className="text-button" onClick={clearSignature} disabled={!hasSignature}><Trash2 size={14} /> Clear</button>
            </div>
            <canvas ref={canvasRef} className="signature-canvas" aria-label="Draw your signature here" />
            <div className="signature-baseline"><span>Sign above this line</span><span>✦</span></div>
          </div>
        </div>
        <div className="document-toolbar">
          <div className="toolbar-title"><span className="step-number">03</span><div><h2>Place your signature</h2>
            <p>{placements.length ? placements.length + ' placement(s) · drag to move · corner handle to resize' : 'Add your signature to any page below.'}</p></div></div>
          <div className="viewer-controls">
            <button type="button" aria-label="Zoom out" onClick={() => setZoom((v) => Math.max(0.65, Number((v - 0.1).toFixed(2))))} disabled={!pdfDocument || zoom <= 0.65}><ZoomOut size={16} /></button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" aria-label="Zoom in" onClick={() => setZoom((v) => Math.min(1.5, Number((v + 0.1).toFixed(2))))} disabled={!pdfDocument || zoom >= 1.5}><ZoomIn size={16} /></button>
          </div>
        </div>
        {pages.length ? <>
          <nav className="page-navigation" aria-label="Jump to page"><span>Pages</span>
            {pages.map((_, i) => <button type="button" key={i} onClick={() => goToPage(i + 1)}>{i + 1}</button>)}
          </nav>
          <div className="pdf-document-viewer">
            {pages.map((page, i) => <PdfPage key={i} page={page} pageNumber={i + 1} zoom={zoom}
              placements={placements.filter((item) => item.pageIndex === i)} signatureData={signatureData}
              imageAspectRatio={imageAspectRatio} onAddSignature={addSignatureToPage}
              onChangePlacement={updatePlacement} onRemovePlacement={(id) => setPlacements((items) => items.filter((item) => item.id !== id))} />)}
          </div>
        </> : <div className="empty-document"><FileText size={30} /><strong>{busy ? 'Preparing your document…' : 'Your PDF preview will appear here'}</strong>
          <span>Choose a PDF to see every page and place signatures directly on the document.</span></div>}
        <div className="export-row"><div className="export-summary"><strong>{placements.length} signature {placements.length === 1 ? 'placement' : 'placements'}</strong><small>{pages.length ? pages.length + ' document pages' : 'No document loaded'}</small></div>
          <button type="button" className="export-button" onClick={exportSignedPdf} disabled={!pdfBytes || !placements.length || busy}><Download size={18} /> {busy ? 'Please wait…' : 'Download signed PDF'}</button>
        </div>
        <p className={'status-message' + (error ? ' is-error' : '')} role="status" aria-live="polite">{error || message}</p>
      </section>
      <footer className="trust-footer">
        <div><ShieldCheck size={17} /><span><strong>Your files stay on your device.</strong><small>PDF preview, signature placement and export run locally in your browser.</small></span></div>
        <p>A drawn signature is a visual mark, not a certificate-backed digital signature.</p>
      </footer>
    </main>
  )
}

export default App
