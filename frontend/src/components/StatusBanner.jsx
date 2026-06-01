// src/components/StatusBanner.jsx
// Small status indicator showing backend health.
export default function StatusBanner({ health }) {

  if (health === undefined) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#4a4a5a' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#363645',
                    animation: 'pulse 1s ease-in-out infinite' }} />
      Connecting…
    </div>
  )

  if (health === null) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#f87171',
                  flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
      Backend offline — run:&nbsp;
      <code style={{ fontFamily: "'DM Mono', monospace", background: '#16161f',
                     padding: '2px 6px', borderRadius: 4 }}>
        uvicorn main:app --reload
      </code>
    </div>
  )

  if (!health.yolo_loaded) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#facc15' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#facc15' }} />
      Connected · YOLO not found (regex fallback)
    </div>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#7fffb2' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7fffb2',
                    animation: 'pulse 2s ease-in-out infinite' }} />
      API connected · YOLO + EasyOCR ready
    </div>
  )
}