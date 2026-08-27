import { useMemo } from 'react'
import { ROOM_DEFS } from './rooms'

function fmtDur(s) {
  if (!s) return '0s'
  if (s < 60) return `${Math.round(s)}s`
  const m = Math.floor(s / 60)
  const sec = Math.round(s % 60)
  if (m < 60) return sec > 0 ? `${m}m ${sec}s` : `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function computeStreak(allNotes) {
  const days = new Set(allNotes.map(n => n.createdAt ? new Date(n.createdAt).toDateString() : null).filter(Boolean))
  let count = 0
  const d = new Date()
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1)
  while (days.has(d.toDateString())) { count++; d.setDate(d.getDate() - 1) }
  return count
}

export default function Stats({ notesByRoom, roomCodes, onBack }) {
  const ROOMS = ROOM_DEFS

  const allNotes = useMemo(() =>
    ROOMS.flatMap(r => notesByRoom[r.id] || []),
  [notesByRoom])

  const totalDuration = allNotes.reduce((s, n) => s + (n.duration || 0), 0)
  const totalNotes = allNotes.length
  const streak = computeStreak(allNotes)

  const roomStats = useMemo(() =>
    ROOMS.map(r => ({
      room: r,
      count: (notesByRoom[r.id] || []).length,
      duration: (notesByRoom[r.id] || []).reduce((s, n) => s + (n.duration || 0), 0),
    })).sort((a, b) => b.count - a.count),
  [notesByRoom])

  const topRoom = roomStats[0]

  const hourBuckets = useMemo(() => {
    const h = Array(24).fill(0)
    allNotes.forEach(n => { if (n.createdAt) h[new Date(n.createdAt).getHours()]++ })
    return h
  }, [allNotes])

  const peakHour = hourBuckets.indexOf(Math.max(...hourBuckets))
  const maxBucket = Math.max(...hourBuckets, 1)

  const handleExport = () => {
    const payload = ROOMS.map(r => ({
      room: r.name,
      icon: r.icon,
      notes: (notesByRoom[r.id] || []).map(n => ({
        id: n.id,
        createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : null,
        duration: n.duration,
        mood: n.mood || null,
        transcript: n.transcript || null,
        audioUrl: n.audioUrl,
      })),
    }))
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `diario-vocale-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="stats-view">
      <header className="nav-bar">
        <button className="btn-icon" onClick={onBack}>&#8592;</button>
        <div className="nav-title-block">
          <span className="nav-title">Statistiche</span>
          <span className="nav-eyebrow">Il tuo diario in numeri</span>
        </div>
        <div style={{ width: '34px' }} />
      </header>

      <div className="stats-scroll">

        {/* Big numbers */}
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">{totalNotes}</span>
            <span className="stat-label">Note totali</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{fmtDur(totalDuration)}</span>
            <span className="stat-label">Tempo registrato</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">🔥 {streak}</span>
            <span className="stat-label">{streak === 1 ? 'giorno' : 'giorni'} di fila</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{topRoom?.count > 0 ? topRoom.room.icon : '—'}</span>
            <span className="stat-label">{topRoom?.count > 0 ? topRoom.room.name : 'Nessuna nota'}</span>
          </div>
        </div>

        {/* Hour chart */}
        <section className="stats-section">
          <p className="stats-section-title">
            Orario preferito
            {hourBuckets[peakHour] > 0 && (
              <span className="stats-section-sub">
                picco alle {peakHour}:00
              </span>
            )}
          </p>
          <div className="hour-chart">
            {hourBuckets.map((count, h) => (
              <div key={h} className="hour-col">
                <div
                  className="hour-bar"
                  style={{ height: `${(count / maxBucket) * 48}px`, opacity: count > 0 ? 1 : 0.15 }}
                />
                {h % 6 === 0 && <span className="hour-label">{h}h</span>}
              </div>
            ))}
          </div>
        </section>

        {/* Room breakdown */}
        <section className="stats-section">
          <p className="stats-section-title">Per stanza</p>
          <div className="room-breakdown">
            {roomStats.map(({ room, count, duration }) => (
              <div key={room.id} className="room-stat-row">
                <div className="room-stat-left">
                  <span>{room.icon}</span>
                  <span className="room-stat-name">{room.name}</span>
                </div>
                <div className="room-stat-right">
                  <div
                    className="room-stat-bar"
                    style={{
                      width: `${totalNotes > 0 ? (count / totalNotes) * 100 : 0}%`,
                      background: room.color
                    }}
                  />
                  <span className="room-stat-count">{count} {count === 1 ? 'nota' : 'note'}</span>
                  {duration > 0 && <span className="room-stat-dur">{fmtDur(duration)}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Export */}
        <section className="stats-section">
          <p className="stats-section-title">Esportazione dati</p>
          <div className="export-card">
            <div className="export-info">
              <p className="export-title">Scarica il tuo diario</p>
              <p className="export-desc">JSON con tutte le note, trascrizioni, mood e metadati. I file audio rimangono sul server.</p>
            </div>
            <button className="export-btn" onClick={handleExport} disabled={totalNotes === 0}>
              ↓ Esporta
            </button>
          </div>
        </section>

      </div>
    </div>
  )
}
