// src/components/HistoryTable.jsx
// =================================
// Table of all past passport scans.
// Responsive: on small screens (<700px) hides Nationality, DOB, Scanned.
// On desktop shows all 6 columns with no horizontal scrollbar.

export default function HistoryTable({ records, onDelete, isLoading }) {

  const formatDate = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <>
      {/* ── Responsive CSS injected inline ──────────────────────────────── */}
      <style>{`
        .col-nat, .col-dob, .col-scanned { display: table-cell; }
        @media (max-width: 700px) {
          .col-nat, .col-dob, .col-scanned { display: none !important; }
          .col-pnum { width: 40% !important; }
          .col-name { width: 52% !important; }
          .col-del  { width: 8%  !important; }
        }
        .history-row:hover td { background: rgba(255,255,255,0.02); }
        .del-btn { color: #363645; }
        .del-btn:hover { color: #f87171; }
      `}</style>

      <div className="card" style={{ overflow: 'hidden' }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid #1a1a24'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, background: '#16161f',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24"
                   stroke="#6b6b80" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h2 style={{
              fontFamily: "'Syne', sans-serif", fontWeight: 600,
              color: '#e0e0e8', fontSize: 15, margin: 0
            }}>Scan History</h2>
          </div>
          <span style={{
            fontSize: 10, color: '#4a4a5a', fontFamily: "'DM Mono', monospace",
            background: '#08080e', padding: '3px 10px',
            borderRadius: 20, border: '1px solid #252532'
          }}>
            {records.length} record{records.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Table ────────────────────────────────────────────────────────── */}
        <table style={{
          width: '100%', borderCollapse: 'collapse',
          fontSize: 13, tableLayout: 'fixed'
        }}>

          {/* Fixed column widths — sum = 100% */}
          <colgroup>
            <col className="col-pnum"    style={{ width: '14%' }} />
            <col className="col-name"    style={{ width: '22%' }} />
            <col className="col-nat"     style={{ width: '14%' }} />
            <col className="col-dob"     style={{ width: '16%' }} />
            <col className="col-scanned" style={{ width: '29%' }} />
            <col className="col-del"     style={{ width: '5%'  }} />
          </colgroup>

          <thead>
            <tr style={{ borderBottom: '1px solid #1a1a24' }}>
              {/* Passport # — always visible */}
              <th className="col-pnum" style={thStyle('left')}>Passport #</th>
              {/* Name — always visible */}
              <th className="col-name" style={thStyle('left')}>Name</th>
              {/* Hidden on mobile */}
              <th className="col-nat"  style={thStyle('left')}>Nationality</th>
              <th className="col-dob"  style={thStyle('left')}>Date of Birth</th>
              <th className="col-scanned" style={thStyle('left')}>Scanned</th>
              {/* Delete — always visible */}
              <th className="col-del"  style={thStyle('right')}></th>
            </tr>
          </thead>

          <tbody>

            {/* ── Loading skeletons ──────────────────────────────────────── */}
            {isLoading && [1, 2, 3].map(i => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={tdStyle()}><div className="shimmer-bg" style={sk(80)} /></td>
                <td style={tdStyle()}><div className="shimmer-bg" style={sk(120)} /></td>
                <td className="col-nat"  style={tdStyle()}><div className="shimmer-bg" style={sk(40)} /></td>
                <td className="col-dob"  style={tdStyle()}><div className="shimmer-bg" style={sk(80)} /></td>
                <td className="col-scanned" style={tdStyle()}><div className="shimmer-bg" style={sk(100)} /></td>
                <td style={tdStyle('right')}><div className="shimmer-bg" style={sk(20)} /></td>
              </tr>
            ))}

            {/* ── Empty state ────────────────────────────────────────────── */}
            {!isLoading && records.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '48px 20px', color: '#4a4a5a' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#252532" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p style={{ fontSize: 13 }}>No scans yet. Upload a passport to get started.</p>
                  </div>
                </td>
              </tr>
            )}

            {/* ── Data rows ──────────────────────────────────────────────── */}
            {!isLoading && records.map(record => (
              <tr key={record.id} className="history-row"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>

                {/* Passport Number */}
                <td style={tdStyle()}>
                  <span style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 12,
                    color: record.passport_number === 'Not Found' ? '#4a4a5a' : '#7fffb2',
                    fontStyle: record.passport_number === 'Not Found' ? 'italic' : 'normal',
                    wordBreak: 'break-all',
                  }}>
                    {record.passport_number}
                  </span>
                </td>

                {/* Name */}
                <td style={tdStyle()}>
                  <span style={{
                    color: record.name === 'Not Found' ? '#4a4a5a' : '#9393a8',
                    fontStyle: record.name === 'Not Found' ? 'italic' : 'normal',
                    wordBreak: 'break-word',
                  }}>
                    {record.name}
                  </span>
                </td>

                {/* Nationality — hidden on mobile */}
                <td className="col-nat" style={tdStyle()}>
                  {record.nationality === 'Not Found'
                    ? <span style={{ color: '#363645', fontSize: 12 }}>—</span>
                    : <span style={{
                        fontSize: 11, fontFamily: "'DM Mono', monospace",
                        background: '#08080e', border: '1px solid #252532',
                        color: '#6b6b80', padding: '2px 7px', borderRadius: 4,
                      }}>
                        {record.nationality}
                      </span>
                  }
                </td>

                {/* Date of Birth — hidden on mobile */}
                <td className="col-dob" style={tdStyle()}>
                  <span style={{
                    fontFamily: "'DM Mono', monospace", fontSize: 12,
                    color: record.date_of_birth === 'Not Found' ? '#363645' : '#9393a8',
                  }}>
                    {record.date_of_birth === 'Not Found' ? '—' : record.date_of_birth}
                  </span>
                </td>

                {/* Scanned timestamp — hidden on mobile */}
                <td className="col-scanned" style={{ ...tdStyle(), color: '#363645', fontSize: 11 }}>
                  {formatDate(record.processed_at)}
                </td>

                {/* Delete */}
                <td style={tdStyle('right')}>
                  <button
                    className="del-btn"
                    onClick={() => onDelete(record.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: 4, display: 'inline-flex', alignItems: 'center',
                      borderRadius: 4, transition: 'color 0.15s',
                    }}
                    title="Delete record"
                  >
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24"
                         stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ── Style helpers ──────────────────────────────────────────────────────────────
const thStyle = (align = 'left') => ({
  textAlign: align,
  padding: '10px 16px',      // more padding between columns
  fontSize: 11,              // was 9 — now readable
  fontFamily: "'DM Mono', monospace",
  letterSpacing: '0.06em',   // less tight spacing
  textTransform: 'uppercase',
  color: '#6b6b80',          // slightly brighter than before
  fontWeight: 500,
})

const tdStyle = (align = 'left') => ({
  padding: '12px 16px',      // consistent with th padding
  textAlign: align,
  verticalAlign: 'middle',
})

// Skeleton loader dimensions
const sk = (w) => ({ height: 14, borderRadius: 4, width: w })