// src/App.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { checkHealth, extractPassport, getHistory, deleteRecord } from './api/index.js'
import UploadZone        from './components/UploadZone.jsx'
import ResultCard        from './components/ResultCard.jsx'
import ProcessingOverlay from './components/ProcessingOverlay.jsx'
import HistoryTable      from './components/HistoryTable.jsx'
import StatusBanner      from './components/StatusBanner.jsx'

export default function App() {
  const [health,           setHealth]           = useState(undefined)
  const [currentResult,    setCurrentResult]    = useState(null)
  const [history,          setHistory]          = useState([])
  const [isProcessing,     setIsProcessing]     = useState(false)
  const [uploadProgress,   setUploadProgress]   = useState(0)
  const [historyLoading,   setHistoryLoading]   = useState(true)
  const [errorMessage,     setErrorMessage]     = useState(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showExportMenu,   setShowExportMenu]   = useState(false)  // export dropdown open/closed

  // Ref to close export dropdown when clicking outside
  const exportMenuRef = useRef(null)

  // ── Close export dropdown on outside click ──────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Health check ────────────────────────────────────────────────────────────
  useEffect(() => {
    checkHealth().then(setHealth).catch(() => setHealth(null))
  }, [])

  // ── Load history ────────────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try { setHistory(await getHistory()) }
    catch { console.warn('Could not load history.') }
    finally { setHistoryLoading(false) }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  // ── Upload + OCR ────────────────────────────────────────────────────────────
  const handleUpload = async (file) => {
    setCurrentResult(null)
    setErrorMessage(null)
    setIsProcessing(true)
    setUploadProgress(0)
    try {
      const result = await extractPassport(file, setUploadProgress)
      setCurrentResult(result)
      await loadHistory()
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || err.message || 'Something went wrong.')
    } finally {
      setIsProcessing(false)
    }
  }

  // ── Delete one record ───────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await deleteRecord(id)
      setHistory(prev => prev.filter(r => r.id !== id))
      if (currentResult?.id === id) setCurrentResult(null)
    } catch (err) { console.error('Delete failed:', err) }
  }

  // ── Clear ALL records ────────────────────────────────────────────────────────
  const handleClearAll = async () => {
    try {
      await Promise.all(history.map(r => deleteRecord(r.id)))
      setHistory([])
      setCurrentResult(null)
      setShowClearConfirm(false)
    } catch (err) { console.error('Clear all failed:', err) }
  }

  // ── Export as CSV ────────────────────────────────────────────────────────────
  // Builds a CSV file in the browser and triggers a download. No server needed.
  const handleExportCSV = () => {
    if (history.length === 0) return
    setShowExportMenu(false)

    const headers = ['ID','Passport Number','Name','Nationality','Date of Birth','Filename','Scanned At']
    const rows = history.map(r => [
      r.id,
      `"${r.passport_number}"`,
      `"${r.name}"`,
      `"${r.nationality}"`,
      `"${r.date_of_birth}"`,
      `"${r.filename}"`,
      `"${new Date(r.processed_at).toLocaleString('en-GB')}"`,
    ].join(','))

    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
    triggerDownload(blob, `passport_ocr_${today()}.csv`)
  }

  // ── Export as PDF ────────────────────────────────────────────────────────────
  // Builds an HTML page styled as a report and uses window.print() to save as PDF.
  // The user sees a print dialog — they choose "Save as PDF".
  const handleExportPDF = () => {
    if (history.length === 0) return
    setShowExportMenu(false)

    // Build a styled HTML table for the print window
    const rows = history.map(r => `
      <tr>
        <td>${r.id}</td>
        <td><strong>${r.passport_number}</strong></td>
        <td>${r.name}</td>
        <td>${r.nationality}</td>
        <td>${r.date_of_birth}</td>
        <td>${new Date(r.processed_at).toLocaleString('en-GB')}</td>
      </tr>
    `).join('')

    const totalScans   = history.length
    const successScans = history.filter(r => r.passport_number !== 'Not Found').length
    const rate         = Math.round((successScans / totalScans) * 100)

    // Open a new window with a printable HTML document
    const win = window.open('', '_blank')
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>PassportOCR — Export Report</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 12px;
            color: #111;
            padding: 32px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 2px solid #111;
          }
          .title { font-size: 22px; font-weight: 700; }
          .subtitle { font-size: 12px; color: #666; margin-top: 4px; }
          .stats {
            display: flex; gap: 24px; margin-bottom: 20px;
          }
          .stat {
            text-align: center;
            background: #f5f5f5;
            border-radius: 8px;
            padding: 10px 20px;
          }
          .stat-value { font-size: 20px; font-weight: 700; color: #111; }
          .stat-label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }
          th {
            background: #111;
            color: white;
            padding: 8px 10px;
            text-align: left;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          td {
            padding: 8px 10px;
            border-bottom: 1px solid #eee;
            vertical-align: middle;
          }
          tr:nth-child(even) td { background: #fafafa; }
          tr td:nth-child(2) { font-weight: 600; font-family: monospace; }
          .not-found { color: #aaa; font-style: italic; }
          .footer {
            margin-top: 24px;
            font-size: 10px;
            color: #999;
            text-align: center;
          }
          @media print {
            body { padding: 16px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">🛂 PassportOCR — Scan Report</div>
            <div class="subtitle">Generated on ${new Date().toLocaleString('en-GB')}</div>
          </div>
          <div class="subtitle" style="text-align:right">
            YOLOv8 + EasyOCR<br/>FastAPI + React
          </div>
        </div>

        <div class="stats">
          <div class="stat">
            <div class="stat-value">${totalScans}</div>
            <div class="stat-label">Total Scans</div>
          </div>
          <div class="stat">
            <div class="stat-value">${successScans}</div>
            <div class="stat-label">Passport Found</div>
          </div>
          <div class="stat">
            <div class="stat-value">${rate}%</div>
            <div class="stat-label">Success Rate</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Passport No.</th>
              <th>Full Name</th>
              <th>Nationality</th>
              <th>Date of Birth</th>
              <th>Scanned At</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div class="footer">
          PassportOCR · ${totalScans} records exported · ${new Date().toLocaleDateString('en-GB')}
        </div>

        <script>
          // Auto-open print dialog when page loads
          window.onload = () => window.print()
        </script>
      </body>
      </html>
    `)
    win.document.close()
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const triggerDownload = (blob, filename) => {
    const url  = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = filename; link.click()
    URL.revokeObjectURL(url)
  }
  const today = () => new Date().toISOString().slice(0, 10)

  // ── Stats ────────────────────────────────────────────────────────────────────
  const totalScans   = history.length
  const successScans = history.filter(r => r.passport_number !== 'Not Found').length
  const successRate  = totalScans > 0 ? Math.round((successScans / totalScans) * 100) : 0

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#08080e', color: '#e0e0e8' }}>

      {/* Background glow blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -160, left: -160, width: 384, height: 384,
                      borderRadius: '50%', background: 'rgba(127,255,178,0.05)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: -160, right: -160, width: 384, height: 384,
                      borderRadius: '50%', background: 'rgba(127,255,178,0.03)', filter: 'blur(60px)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 10, maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <header style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12,
                            background: 'rgba(127,255,178,0.12)', border: '1px solid rgba(127,255,178,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#7fffb2" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
                </svg>
              </div>
              <div>
                <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700,
                              color: '#f0f0f4', lineHeight: 1, margin: 0 }}>PassportOCR</h1>
                <p style={{ fontSize: 13, color: '#4a4a5a', marginTop: 3 }}> Easy OCR</p>
              </div>
            </div>
            <StatusBanner health={health} />
          </div>
          <p style={{ fontSize: 14, color: '#6b6b80', marginTop: 12, lineHeight: 1.6 }}>
            Upload a passport image and the AI will automatically extract the passport number,
            name, date of birth, and nationality.
          </p>
        </header>

        {/* ── Stats Bar ──────────────────────────────────────────────────────── */}
        {totalScans > 0 && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Scans',    value: totalScans    },
              { label: 'Passport Found', value: successScans  },
              { label: 'Success Rate',   value: `${successRate}%`,
                color: successRate >= 70 ? '#4ade80' : successRate >= 40 ? '#facc15' : '#f87171' },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, minWidth: 120, background: '#0d0d14',
                                    border: '1px solid #252532', borderRadius: 12, padding: '14px 18px' }}>
                <p style={{ fontSize: 10, color: '#4a4a5a', fontFamily: "'DM Mono', monospace",
                             textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>
                  {s.label}
                </p>
                <p style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Syne', sans-serif",
                             color: s.color || '#7fffb2', margin: 0 }}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Upload + Result side by side ───────────────────────────────────── */}
        <div style={{ display: 'grid',
                      gridTemplateColumns: currentResult && !isProcessing ? '1fr 1fr' : '1fr',
                      gap: 20, marginBottom: 24, alignItems: 'start' }}>
          <section>
            {!isProcessing && <UploadZone onUpload={handleUpload} isLoading={isProcessing} />}
            {isProcessing  && <ProcessingOverlay uploadProgress={uploadProgress} />}
          </section>
          {currentResult && !isProcessing && (
            <ResultCard result={currentResult} onClose={() => setCurrentResult(null)} />
          )}
        </div>

        {/* ── Error ──────────────────────────────────────────────────────────── */}
        {errorMessage && (
          <div className="animate-fade-up" style={{
            marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 12,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#fca5a5', borderRadius: 12, padding: '12px 16px', fontSize: 14
          }}>
            <svg width="20" height="20" style={{ flexShrink: 0, marginTop: 2 }}
                 fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>Extraction failed</p>
              <p style={{ color: 'rgba(252,165,165,0.8)' }}>{errorMessage}</p>
            </div>
            <button onClick={() => setErrorMessage(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5' }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* ── Divider ────────────────────────────────────────────────────────── */}
        <div style={{ borderTop: '1px solid #252532', margin: '32px 0' }} />

        {/* ── Table Action Buttons ────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end',
                      gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>

          {/* ── Export dropdown ─────────────────────────────────────────────── */}
          <div ref={exportMenuRef} style={{ position: 'relative' }}>

            {/* Export button */}
            <button
              onClick={() => setShowExportMenu(v => !v)}
              disabled={history.length === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: showExportMenu
                  ? 'rgba(127,255,178,0.15)'
                  : 'rgba(127,255,178,0.08)',
                border: '1px solid rgba(127,255,178,0.25)',
                color: '#7fffb2', borderRadius: 8, padding: '7px 14px',
                fontSize: 12, fontFamily: "'DM Mono', monospace",
                cursor: history.length === 0 ? 'not-allowed' : 'pointer',
                opacity: history.length === 0 ? 0.4 : 1,
                transition: 'all 0.15s',
              }}
            >
              {/* Download icon */}
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
              {/* Chevron arrow — rotates when open */}
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                   style={{ transition: 'transform 0.2s',
                            transform: showExportMenu ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* ── Dropdown menu ─────────────────────────────────────────────── */}
            {showExportMenu && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                background: '#16161f', border: '1px solid #363645',
                borderRadius: 10, overflow: 'hidden', zIndex: 100,
                minWidth: 180,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                animation: 'fadeUp 0.15s ease-out',
              }}>

                {/* CSV option */}
                <button
                  onClick={handleExportCSV}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 16px', background: 'none', border: 'none',
                    color: '#e0e0e8', cursor: 'pointer', fontSize: 13,
                    fontFamily: "'DM Sans', sans-serif", textAlign: 'left',
                    borderBottom: '1px solid #252532', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  {/* CSV icon */}
                  <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                                background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#4ade80" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75.125v-7.5A1.125 1.125 0 013.375 9.75h.75m12 0h.75a1.125 1.125 0 011.125 1.125v7.5m0 .125a1.125 1.125 0 01-1.125 1.125H18m0-10.5v-3.75A1.125 1.125 0 0016.875 4.5h-9.75A1.125 1.125 0 006 5.625v3.75" />
                    </svg>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 500 }}>Export as CSV</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#6b6b80', marginTop: 1 }}>
                      Opens in Excel / Sheets
                    </p>
                  </div>
                </button>

                {/* PDF option */}
                <button
                  onClick={handleExportPDF}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 16px', background: 'none', border: 'none',
                    color: '#e0e0e8', cursor: 'pointer', fontSize: 13,
                    fontFamily: "'DM Sans', sans-serif", textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  {/* PDF icon */}
                  <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                                background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#f87171" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 500 }}>Export as PDF</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#6b6b80', marginTop: 1 }}>
                      Print-ready report
                    </p>
                  </div>
                </button>

              </div>
            )}
          </div>

          {/* ── Clear All ──────────────────────────────────────────────────── */}
          {!showClearConfirm ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={history.length === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'transparent', border: '1px solid #363645',
                color: '#6b6b80', borderRadius: 8, padding: '7px 14px',
                fontSize: 12, fontFamily: "'DM Mono', monospace",
                cursor: history.length === 0 ? 'not-allowed' : 'pointer',
                opacity: history.length === 0 ? 0.4 : 1,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (history.length > 0) { e.currentTarget.style.borderColor = '#f87171'; e.currentTarget.style.color = '#f87171' }}}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#363645'; e.currentTarget.style.color = '#6b6b80' }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear All
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8,
                          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                          borderRadius: 8, padding: '7px 14px' }}>
              <span style={{ fontSize: 12, color: '#fca5a5' }}>Delete all {history.length} records?</span>
              <button onClick={handleClearAll}
                style={{ background: '#ef4444', border: 'none', color: 'white',
                         borderRadius: 6, padding: '3px 10px', fontSize: 11,
                         cursor: 'pointer', fontWeight: 600 }}>
                Yes, delete
              </button>
              <button onClick={() => setShowClearConfirm(false)}
                style={{ background: 'none', border: '1px solid #363645', color: '#9393a8',
                         borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* ── History Table ───────────────────────────────────────────────────── */}
        <HistoryTable records={history} onDelete={handleDelete} isLoading={historyLoading} />

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <footer style={{ marginTop: 48, textAlign: 'center', fontSize: 14, color: '#252532' }}>
          Passport OCR 
        </footer>
      </div>
    </div>
  )
}