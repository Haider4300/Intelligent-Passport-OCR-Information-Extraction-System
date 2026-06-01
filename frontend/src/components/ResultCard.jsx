// src/components/ResultCard.jsx
// Displays extracted passport fields in a clean card.
export default function ResultCard({ result, onClose }) {
  if (!result) return null

  // Color for YOLO confidence badge
  const confColor = result.yolo_confidence > 0.75 ? '#4ade80'
                  : result.yolo_confidence > 0.40 ? '#facc15'
                  :                                  '#f87171'

  // Dim "Not Found" fields
  const valStyle = (v) => ({
    fontFamily: "'DM Mono', monospace",
    fontSize: 17,
    fontWeight: 500,
    color: v === 'Not Found' ? '#4a4a5a' : '#f0f0f4',
    fontStyle: v === 'Not Found' ? 'italic' : 'normal',
    margin: 0,
  })

  return (
    <div className="card animate-fade-up" style={{ overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 20px', borderBottom: '1px solid #1a1a24' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Green checkmark */}
          <div style={{ width: 32, height: 32, borderRadius: '50%',
                        background: 'rgba(127,255,178,0.12)', border: '1px solid rgba(127,255,178,0.35)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#7fffb2" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, color: '#f0f0f4',
                        fontSize: 15, margin: 0 }}>Extraction Complete</p>
            <p style={{ fontSize: 11, color: '#4a4a5a', marginTop: 2 }}>
              Scanned: {result.filename}
            </p>
          </div>
        </div>
        <button onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a4a5a',
                   padding: 4, display: 'flex', alignItems: 'center' }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Fields grid */}
      <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* Passport Number — full width */}
        <div style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.02)',
                      border: '1px solid #252532', borderRadius: 10, padding: '12px 16px' }}>
          <p className="field-label" style={{ marginBottom: 6 }}>Passport Number</p>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 26, fontWeight: 500,
                      color: '#7fffb2', letterSpacing: '0.12em', margin: 0 }}>
            {result.passport_number}
          </p>
        </div>

        {/* Name */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1e1e28',
                      borderRadius: 10, padding: '12px 16px' }}>
          <p className="field-label" style={{ marginBottom: 6 }}>Full Name</p>
          <p style={valStyle(result.name)}>{result.name}</p>
        </div>

        {/* Nationality */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1e1e28',
                      borderRadius: 10, padding: '12px 16px' }}>
          <p className="field-label" style={{ marginBottom: 6 }}>Nationality</p>
          <p style={valStyle(result.nationality)}>{result.nationality}</p>
        </div>

        {/* Date of Birth */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1e1e28',
                      borderRadius: 10, padding: '12px 16px' }}>
          <p className="field-label" style={{ marginBottom: 6 }}>Date of Birth</p>
          <p style={valStyle(result.date_of_birth)}>{result.date_of_birth}</p>
        </div>

        {/* Detection metadata */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1e1e28',
                      borderRadius: 10, padding: '12px 16px' }}>
          <p className="field-label" style={{ marginBottom: 8 }}>Detection Method</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", padding: '3px 10px',
                           borderRadius: 20, display: 'inline-block', alignSelf: 'flex-start',
                           background: result.yolo_detected ? 'rgba(127,255,178,0.08)' : 'rgba(255,255,255,0.04)',
                           border: `1px solid ${result.yolo_detected ? 'rgba(127,255,178,0.3)' : '#363645'}`,
                           color: result.yolo_detected ? '#7fffb2' : '#6b6b80' }}>
              {result.yolo_detected ? '● YOLO detected' : '○ Regex fallback'}
            </span>
            {result.yolo_detected && (
              <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", padding: '3px 10px',
                             borderRadius: 20, display: 'inline-block', alignSelf: 'flex-start',
                             background: 'rgba(0,0,0,0.2)', border: `1px solid ${confColor}40`,
                             color: confColor }}>
                {(result.yolo_confidence * 100).toFixed(1)}% confidence
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '0 20px 14px', fontSize: 11, color: '#363645',
                    display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Record ID #{result.id} · Saved to history
      </div>
    </div>
  )
}