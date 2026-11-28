import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import {
  CheckCircle2,
  Download,
  FileSignature,
  FileText,
  LockKeyhole,
  PenLine,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react'
import { PDFDocument } from 'pdf-lib'
import SignaturePad from 'signature_pad'
import './App.css'

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const signaturePadRef = useRef<SignaturePad | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [hasSignature, setHasSignature] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Choose a PDF to get started.')
  const [error, setError] = useState('')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const signaturePad = new SignaturePad(canvas, {
      minWidth: 0.8,
      maxWidth: 2.4,
      penColor: '#211b1c',
      onEnd: () => setHasSignature(true),
    })
    signaturePadRef.current = signaturePad

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect()
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      canvas.width = Math.round(bounds.width * ratio)
      canvas.height = Math.round(bounds.height * ratio)
      const context = canvas.getContext('2d')
      context?.setTransform(ratio, 0, 0, ratio, 0, 0)
      signaturePad.clear()
      setHasSignature(false)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      signaturePad.off()
      signaturePadRef.current = null
    }
  }, [])

  const handlePdfUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setError('')
    setBusy(true)
    setMessage('Checking your PDF…')

    try {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        throw new Error('Please choose a PDF file.')
      }

      const bytes = new Uint8Array(await file.arrayBuffer())
      const loadedDocument = await PDFDocument.load(bytes)
      if (loadedDocument.getPageCount() === 0) {
        throw new Error('This PDF does not contain any pages.')
      }

      setPdfBytes(bytes)
      setPdfFile(file)
      setPageCount(loadedDocument.getPageCount())
      setMessage('PDF ready. Add your signature below.')
      signaturePadRef.current?.clear()
      setHasSignature(false)
    } catch (cause) {
      setPdfBytes(null)
      setPdfFile(null)
      setPageCount(0)
      setError(cause instanceof Error ? cause.message : 'We could not read this PDF.')
      setMessage('Choose another PDF to continue.')
    } finally {
      setBusy(false)
    }
  }

  const clearSignature = () => {
    signaturePadRef.current?.clear()
    setHasSignature(false)
  }

  const exportSignedPdf = async () => {
    const signaturePad = signaturePadRef.current
    if (!pdfBytes || !signaturePad || signaturePad.isEmpty()) {
      setError('Choose a PDF and draw your signature before exporting.')
      return
    }

    setBusy(true)
    setError('')
    setMessage('Preparing your signed PDF…')

    try {
      const signedDocument = await PDFDocument.load(pdfBytes)
      const firstPage = signedDocument.getPages()[0]
      const signatureImage = await signedDocument.embedPng(signaturePad.toDataURL('image/png'))
      const signatureWidth = Math.min(180, firstPage.getWidth() * 0.36)
      const signatureHeight = (signatureImage.height / signatureImage.width) * signatureWidth

      firstPage.drawImage(signatureImage, {
        x: firstPage.getWidth() - signatureWidth - 42,
        y: 42,
        width: signatureWidth,
        height: signatureHeight,
      })

      const savedBytes = await signedDocument.save()
      const downloadableBytes = new Uint8Array(savedBytes.length)
      downloadableBytes.set(savedBytes)
      const blob = new Blob([downloadableBytes.buffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const originalName = pdfFile?.name.replace(/\.pdf$/i, '') || 'document'
      link.href = url
      link.download = `${originalName}-signed.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)

      setMessage('Your signed PDF has been downloaded.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The PDF could not be exported.')
      setMessage('Export did not complete. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="PaperSign home">
          <span className="brand-mark"><FileSignature size={22} strokeWidth={1.8} /></span>
          <span>Paper<span>Sign</span></span>
        </a>
        <div className="privacy-note"><LockKeyhole size={15} /> Private by design</div>
      </header>

      <section className="intro">
        <div className="eyebrow"><span /> SIMPLE. PRIVATE. YOURS.</div>
        <h1>Make it official.<br /><em>Keep it personal.</em></h1>
        <p>Sign a PDF in a few simple steps. Your document stays on this device, not on a server.</p>
      </section>

      <section className="workspace" aria-label="PDF signing workspace">
        <div className="step-heading">
          <span className="step-number">01</span>
          <div><h2>Choose your document</h2><p>Start with the PDF you need to sign.</p></div>
        </div>

        <label className={`upload-zone ${pdfFile ? 'has-file' : ''}`}>
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={handlePdfUpload}
            disabled={busy}
          />
          <span className="upload-icon"><Upload size={22} /></span>
          {pdfFile ? (
            <span className="file-details">
              <strong>{pdfFile.name}</strong>
              <small>{formatFileSize(pdfFile.size)} · {pageCount} {pageCount === 1 ? 'page' : 'pages'}</small>
            </span>
          ) : (
            <span className="upload-copy">
              <strong>Choose a PDF or <u>browse files</u></strong>
              <small>PDF documents only</small>
            </span>
          )}
          {pdfFile && <CheckCircle2 className="file-check" size={20} />}
        </label>

        <div className="step-heading signature-heading">
          <span className="step-number">02</span>
          <div><h2>Add your signature</h2><p>Draw naturally with your mouse, trackpad or touchscreen.</p></div>
        </div>

        <div className="signature-card">
          <div className="signature-toolbar">
            <span><PenLine size={15} /> Signature canvas</span>
            <button type="button" className="text-button" onClick={clearSignature} disabled={!hasSignature}>
              <Trash2 size={14} /> Clear
            </button>
          </div>
          <canvas ref={canvasRef} className="signature-canvas" aria-label="Draw your signature here" />
          <div className="signature-baseline"><span>Sign above this line</span><span>✦</span></div>
        </div>

        <div className="placement-note">
          <FileText size={17} />
          <span><strong>Signature placement</strong><small>First page · bottom-right corner</small></span>
        </div>

        <button
          type="button"
          className="export-button"
          onClick={exportSignedPdf}
          disabled={!pdfBytes || !hasSignature || busy}
        >
          <Download size={18} />
          {busy ? 'Please wait…' : 'Download signed PDF'}
        </button>

        <p className={`status-message ${error ? 'is-error' : ''}`} role="status" aria-live="polite">
          {error || message}
        </p>
      </section>

      <footer className="trust-footer">
        <div><ShieldCheck size={17} /><span><strong>Your files stay on your device.</strong><small>PaperSign processes this document locally in your browser.</small></span></div>
        <p>A drawn signature is a visual mark, not a certificate-backed digital signature.</p>
      </footer>
    </main>
  )
}

export default App
