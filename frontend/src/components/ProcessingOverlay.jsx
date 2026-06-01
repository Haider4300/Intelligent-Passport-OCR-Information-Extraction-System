// src/components/ProcessingOverlay.jsx
// Animated loading screen shown while OCR is running.
export default function ProcessingOverlay({ uploadProgress }) {
  const steps = [
    { label: 'Uploading Image',         icon: '📤', active: uploadProgress < 100  },
    { label: 'Running Detection',  icon: '🎯', active: uploadProgress >= 100 },
    { label: 'Reading Text with OCR',   icon: '🔍', active: false },
    { label: 'Parsing Passport Fields', icon: '📋', active: false },
  ]
  const activeIndex = uploadProgress < 100 ? 0 : 1

  return (
    <div className="card animate-fade-up"
         style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>

      {/* Spinner rings */}
      <div style={{ position: 'relative', width: 80, height: 80 }}>
        <div className="animate-pulse-ring" style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '2px solid rgba(127,255,178,0.3)'
        }} />
        <div style={{
          position: 'absolute', inset: 8, borderRadius: '50%',
          border: '2px solid transparent',
          borderTopColor: '#7fffb2',
          animation: 'spin 1.2s linear infinite'
        }} />
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#7fffb2',
                        animation: 'pulse 1s ease-in-out infinite' }} />
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 600,
                     color: '#f0f0f4', margin: '0 0 6px' }}>Analysing Passport</h3>
        <p style={{ fontSize: 13, color: '#6b6b80', margin: 0 }}>AI models are reading your document…</p>
      </div>

      {/* Upload progress bar */}
      {uploadProgress < 100 && (
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between',
                        fontSize: 11, color: '#4a4a5a', marginBottom: 6 }}>
            <span>Uploading…</span><span>{uploadProgress}%</span>
          </div>
          <div style={{ height: 6, background: '#16161f', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${uploadProgress}%`,
                          background: '#7fffb2', borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {/* Steps */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map((step, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px', borderRadius: 10, transition: 'all 0.4s',
            background: i === activeIndex ? 'rgba(127,255,178,0.08)' : 'transparent',
            border: i === activeIndex ? '1px solid rgba(127,255,178,0.25)' : '1px solid transparent',
            opacity: i === activeIndex ? 1 : 0.35,
          }}>
            <span style={{ fontSize: 16 }}>{step.icon}</span>
            <span style={{ fontSize: 13, color: '#e0e0e8', flex: 1 }}>{step.label}</span>
            {i === activeIndex && (
              <svg width="16" height="16" style={{ animation: 'spin 1s linear infinite', color: '#7fffb2' }}
                   fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".25"/>
                <path fill="currentColor" opacity=".75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            )}
          </div>
        ))}
      </div>

      <p style={{ fontSize: 11, color: '#363645', textAlign: 'center' }}>
        First scan takes ~15s while models warm up. Subsequent scans are faster.
      </p>
    </div>
  )
}