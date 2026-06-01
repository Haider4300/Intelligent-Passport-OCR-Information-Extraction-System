// src/components/UploadZone.jsx
// Drag-and-drop passport image uploader.
import { useState, useRef, useCallback } from 'react'

export default function UploadZone({ onUpload, isLoading }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl,   setPreviewUrl]   = useState(null)
  const [isDragging,   setIsDragging]   = useState(false)
  const [error,        setError]        = useState(null)
  const fileInputRef = useRef(null)

  // Validate and store the chosen file
  const handleFile = useCallback((file) => {
    setError(null)
    const valid = ['image/jpeg','image/jpg','image/png','image/bmp']
    if (!valid.includes(file.type)) { setError('Please upload a JPG or PNG image.'); return }
    if (file.size > 10 * 1024 * 1024) { setError('File too large. Max 10MB.'); return }
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }, [])

  const handleDragOver  = e => { e.preventDefault(); setIsDragging(true)  }
  const handleDragLeave = e => { e.preventDefault(); setIsDragging(false) }
  const handleDrop      = e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }
  const handleChange    = e => { const f = e.target.files[0]; if (f) handleFile(f) }
  const handleClear     = () => { setSelectedFile(null); setPreviewUrl(null); setError(null); if (fileInputRef.current) fileInputRef.current.value = '' }
  const handleSubmit    = () => { if (selectedFile && onUpload) onUpload(selectedFile) }

  // ── Drop zone (no file selected yet) ────────────────────────────────────
  if (!selectedFile) return (
    <div>
      <div
        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? '#7fffb2' : '#363645'}`,
          borderRadius: 16, padding: '48px 24px', textAlign: 'center',
          cursor: 'pointer', transition: 'all 0.2s',
          background: isDragging ? 'rgba(127,255,178,0.06)' : 'transparent',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        }}
      >
        {/* Icon */}
        <div style={{ width: 64, height: 64, borderRadius: 14,
                      background: isDragging ? 'rgba(127,255,178,0.15)' : '#16161f',
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="30" height="30" fill="none" viewBox="0 0 24 24"
               stroke={isDragging ? '#7fffb2' : '#6b6b80'} strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>

        {/* Text */}
        <div>
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 600,
                      color: isDragging ? '#7fffb2' : '#e0e0e8', margin: 0 }}>
            {isDragging ? 'Drop it here!' : 'Drop passport image here'}
          </p>
          <p style={{ fontSize: 13, color: '#6b6b80', marginTop: 6 }}>
            or <span style={{ color: '#7fffb2', textDecoration: 'underline' }}>click to browse</span>
          </p>
          <p style={{ fontSize: 11, color: '#363645', marginTop: 10 }}>JPG, PNG, BMP — max 10MB</p>
        </div>

        <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/bmp"
               onChange={handleChange} style={{ display: 'none' }} />
      </div>

      {/* Error */}
      {error && (
        <p style={{ marginTop: 12, fontSize: 13, color: '#f87171',
                    display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )

  // ── Preview (file selected) ──────────────────────────────────────────────
  return (
    <div className="card animate-fade-up" style={{ overflow: 'hidden' }}>
      {/* Image preview */}
      <div style={{ position: 'relative' }}>
        <img src={previewUrl} alt="Passport preview"
             style={{ width: '100%', maxHeight: 280, objectFit: 'contain', background: '#08080e', display: 'block' }} />
        {/* Clear button */}
        <button onClick={handleClear} disabled={isLoading}
          style={{ position: 'absolute', top: 12, right: 12,
                   background: 'rgba(13,13,20,0.8)', border: '1px solid #363645',
                   borderRadius: 8, padding: 6, cursor: 'pointer', color: '#9393a8',
                   display: 'flex', alignItems: 'center', backdropFilter: 'blur(4px)' }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* File info + submit */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13, color: '#e0e0e8', fontWeight: 500,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
            {selectedFile.name}
          </p>
          <p style={{ fontSize: 11, color: '#4a4a5a', marginTop: 2 }}>
            {(selectedFile.size / 1024).toFixed(1)} KB
          </p>
        </div>

        <button onClick={handleSubmit} disabled={isLoading} className="btn-primary" style={{ flexShrink: 0 }}>
          {isLoading ? (
            <>
              <svg width="16" height="16" style={{ animation: 'spin 1s linear infinite' }}
                   fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".25"/>
                <path fill="currentColor" opacity=".75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Extracting…
            </>
          ) : (
            <>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Extract Data
            </>
          )}
        </button>
      </div>
    </div>
  )
}