import { useState, useEffect, useMemo } from 'react'
import { ROOM_DEFS } from './rooms'
import { useRecorder } from './useRecorder'

async function getOrCreateRoomCode(roomId) {
  const key = `diary-room-${roomId}`
  const existing = localStorage.getItem(key)
  if (existing) {
    try {
      const res = await fetch(`/api/rooms/${existing}`)
      if (res.ok) return existing
    } catch {}
  }
  const res = await fetch('/api/rooms', { method: 'POST' })
  const { code } = await res.json()
  localStorage.setItem(key, code)
  return code
}

function fmtTotalDur(seconds) {
  if (!seconds) return null
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.round(seconds / 60)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`
}

const TABS = [
  { id: 'diario', label: 'Diario', icon: '💬' },
  { id: 'stanze', label: 'Stanze', icon: '🏠' },
  { id: 'sfide', label: 'Sfide', icon: '🏆' },
  { id: 'impostazioni', label: 'Impostazioni', icon: '⚙️' },
]

export default function Home({ onEnterRoom, onGuide, onLogout }) {
  const [tab, setTab] = useState('diario')
  const [roomCodes, setRoomCodes] = useState({})
  const [notesByRoom, setNotesByRoom] = useState({})
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d
  })
  const [loading, setLoading] = useState(true)
  const [fabOpen, setFabOpen] = useState(false)
  const [fabStep, setFabStep] = useState('pick')
  const [fabRoom, setFabRoom] = useState(null)
  const [fabUploading, setFabUploading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function init() {
      const codes = {}
      const notes = {}
      await Promise.all(ROOM_DEFS.map(async room => {
        const code = await getOrCreateRoomCode(room.id)
        codes[room.id] = code
        try {
          const res = await fetch(`/api/rooms/${code}`)
          const data = await res.json()
          notes[room.id] = data.notes || []
        } catch { notes[room.id] = [] }
      }))
      if (!cancelled) { setRoomCodes(codes); setNotesByRoom(notes); setLoading(false) }
    }
    init()
    return () => { cancelled = true }
  }, [])

  const dotsByDay = useMemo(() => {
    const map = {}
    ROOM_DEFS.forEach(room => {
      ;(notesByRoom[room.id] || []).forEach(note => {
        if (!note.createdAt) return
        const key = new Date(note.createdAt).toDateString()
        if (!map[key]) map[key] = new Set()
        map[key].add(room.id)
      })
    })
    return map
  }, [notesByRoom])

  const countByRoom = useMemo(() => {
    const map = {}
    ROOM_DEFS.forEach(room => { map[room.id] = (notesByRoom[room.id] || []).length })
    return map
  }, [notesByRoom])

  const durByRoom = useMemo(() => {
    const map = {}
    ROOM_DEFS.forEach(room => {
      map[room.id] = (notesByRoom[room.id] || []).reduce((s, n) => s + (n.duration || 0), 0)
    })
    return map
  }, [notesByRoom])

  const streak = useMemo(() => {
    const allDays = new Set()
    ROOM_DEFS.forEach(room => {
      ;(notesByRoom[room.id] || []).forEach(note => {
        if (note.createdAt) allDays.add(new Date(note.createdAt).toDateString())
      })
    })
    let count = 0
    const d = new Date()
    if (!allDays.has(d.toDateString())) d.setDate(d.getDate() - 1)
    while (allDays.has(d.toDateString())) { count++; d.setDate(d.getDate() - 1) }
    return count
  }, [notesByRoom])

  const enterRoom = roomDef => {
    const code = roomCodes[roomDef.id]
    if (code) onEnterRoom({ ...roomDef, code })
  }

  const openFab = () => { setFabStep('pick'); setFabRoom(null); setFabOpen(true) }
  const closeFab = () => { setFabOpen(false); setFabRoom(null) }

  const handleFabNote = (note, roomId) => {
    setNotesByRoom(prev => ({ ...prev, [roomId]: [...(prev[roomId] || []), note] }))
  }

  return (
    <div className="home-diary">
      <header className="home-nav">
        <div className="home-nav-title">
          <span className="home-large-title">
            <span className="home-title-star" aria-hidden>⭐</span>Diario Vocale
          </span>
          {streak > 0 && (
            <span className="streak-badge">🔥 {streak} {streak === 1 ? 'giorno' : 'giorni'}</span>
          )}
        </div>
        <div className="home-nav-actions">
          <button className="btn-guide" onClick={onGuide}>📖 Guida</button>
          <button className="btn-guide btn-logout" onClick={onLogout}>🚪 Esci</button>
        </div>
      </header>

      <nav className="home-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`home-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="home-tab-icon" aria-hidden>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      <div className="diary-scroll">
        {tab === 'diario' && (
          <>
            <Calendar
              currentMonth={currentMonth}
              onPrev={() => setCurrentMonth(m => { const d = new Date(m); d.setMonth(d.getMonth()-1); return d })}
              onNext={() => setCurrentMonth(m => { const d = new Date(m); d.setMonth(d.getMonth()+1); return d })}
              dotsByDay={dotsByDay}
            />

            <div className="section-header"><span className="section-title">Stanze</span></div>
            <RoomsGrid loading={loading} countByRoom={countByRoom} durByRoom={durByRoom} enterRoom={enterRoom} />

            <div className="section-header"><span className="section-title">Legenda</span></div>
            <div style={{ padding: '0 1rem' }}><Legend /></div>

            <div className="garden-footer">
              <span className="garden-mailbox" aria-hidden>📮</span>
              <span className="garden-speech">Miao! 💕</span>
              <span className="garden-cat" aria-hidden>🐱</span>
            </div>
          </>
        )}

        {tab === 'stanze' && (
          <>
            <div className="section-header"><span className="section-title">Stanze</span></div>
            <RoomsGrid loading={loading} countByRoom={countByRoom} durByRoom={durByRoom} enterRoom={enterRoom} />
          </>
        )}

        {tab === 'sfide' && (
          <div className="placeholder-view">
            <span className="placeholder-icon" aria-hidden>🏆</span>
            <span className="placeholder-title">Sfide in arrivo</span>
            <span>Presto potrai sbloccare traguardi e sfide del diario.</span>
          </div>
        )}

        {tab === 'impostazioni' && (
          <div className="placeholder-view">
            <span className="placeholder-icon" aria-hidden>⚙️</span>
            <span className="placeholder-title">Impostazioni in arrivo</span>
            <span>Qui potrai personalizzare il tuo diario vocale.</span>
          </div>
        )}
      </div>

      {!fabOpen && <button className="fab" onClick={openFab}>🎤</button>}

      {fabOpen && (
        <QuickRecord
          step={fabStep}
          selectedRoom={fabRoom}
          roomCodes={roomCodes}
          uploading={fabUploading}
          onPickRoom={room => { setFabRoom(room); setFabStep('record') }}
          onBack={() => fabStep === 'record' ? setFabStep('pick') : closeFab()}
          onClose={closeFab}
          onNote={handleFabNote}
          setUploading={setFabUploading}
        />
      )}
    </div>
  )
}

/* ─── ROOMS GRID ────────────────────────────────────── */

function RoomsGrid({ loading, countByRoom, durByRoom, enterRoom }) {
  return (
    <div className="rooms-section">
      {loading ? (
        <div className="rooms-grid">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className={`room-card skeleton${i === 4 ? ' skeleton-full' : ''}`} />
          ))}
        </div>
      ) : (
        <div className="rooms-grid">
          {ROOM_DEFS.map(room => (
            <button
              key={room.id}
              className="room-card"
              style={{ '--room-color': room.color, '--room-bg': room.colorBg }}
              onClick={() => enterRoom(room)}
            >
              <span className="room-card-star" aria-hidden>⭐</span>
              <div className="room-card-icon">{room.icon}</div>
              <div className="room-card-body">
                <span className="room-card-name">{room.name}</span>
                <span className="room-card-desc">{room.description}</span>
                <span className="room-card-prompt">"{room.prompt}"</span>
              </div>
              <span className="room-card-watermark" aria-hidden>{room.icon}</span>
              {countByRoom[room.id] > 0 && (
                <div className="room-card-count">
                  <span className="room-note-badge">{countByRoom[room.id]}</span>
                  {durByRoom[room.id] > 0 && (
                    <span className="room-dur-badge">{fmtTotalDur(durByRoom[room.id])}</span>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── QUICK RECORD SHEET ────────────────────────────── */

function QuickRecord({ step, selectedRoom, roomCodes, uploading, onPickRoom, onBack, onClose, onNote, setUploading }) {
  const { isRecording, start, stop } = useRecorder(async (blob, duration) => {
    if (!selectedRoom) return
    setUploading(true)
    try {
      const code = roomCodes[selectedRoom.id]
      const myId = localStorage.getItem('voice-notes-uid') || 'anon'
      const form = new FormData()
      form.append('audio', blob, 'nota.webm')
      form.append('senderId', myId)
      if (duration) form.append('duration', duration.toFixed(2))
      const res = await fetch(`/api/rooms/${code}/notes`, { method: 'POST', body: form })
      const note = await res.json()
      if (note?.id) onNote(note, selectedRoom.id)
      onClose()
    } catch { alert("Errore durante l'invio.") }
    setUploading(false)
  })

  return (
    <div className="fab-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="fab-sheet">
        <div className="fab-sheet-handle" />

        {step === 'pick' && (
          <>
            <p className="fab-sheet-title">Dove vuoi salvare?</p>
            <div className="fab-room-list">
              {ROOM_DEFS.map(room => (
                <button
                  key={room.id}
                  className="fab-room-item"
                  onClick={() => onPickRoom(room)}
                >
                  <span className="fab-room-icon">{room.icon}</span>
                  <div className="fab-room-info">
                    <span className="fab-room-name" style={{ color: room.color }}>{room.name}</span>
                    <span className="fab-room-prompt">"{room.prompt}"</span>
                  </div>
                  <span className="fab-room-chevron">›</span>
                </button>
              ))}
            </div>
            <button className="fab-cancel" onClick={onClose}>Annulla</button>
          </>
        )}

        {step === 'record' && selectedRoom && (
          <div className="fab-record-view">
            <button className="fab-back" onClick={onBack}>‹ Indietro</button>
            <div className="fab-record-room">
              <span style={{ fontSize: '2.5rem' }}>{selectedRoom.icon}</span>
              <span className="fab-room-name" style={{ color: selectedRoom.color, fontSize: '1.1rem' }}>
                {selectedRoom.name}
              </span>
            </div>
            <p className="fab-record-prompt">"{selectedRoom.prompt}"</p>
            <p className="record-hint">
              {uploading ? 'Salvataggio...' : isRecording ? 'Rilascia per salvare' : 'Tieni premuto per registrare'}
            </p>
            <button
              className={isRecording ? 'btn-mic recording' : 'btn-mic'}
              onMouseDown={() => start()}
              onMouseUp={stop}
              onTouchStart={e => { e.preventDefault(); start() }}
              onTouchEnd={e => { e.preventDefault(); stop() }}
              disabled={uploading}
            >
              {uploading ? '…' : isRecording ? '⏹' : '🎤'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── CALENDAR ──────────────────────────────────────── */

const DOW = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

function Calendar({ currentMonth, onPrev, onNext, dotsByDay }) {
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const days = useMemo(() => {
    const first = new Date(year, month, 1)
    const last = new Date(year, month + 1, 0)
    const startDow = (first.getDay() + 6) % 7
    const cells = []
    for (let i = 0; i < startDow; i++) cells.push(null)
    for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d))
    return cells
  }, [year, month])

  const today = new Date()
  const monthLabel = currentMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })

  return (
    <div style={{ padding: '0.75rem 1rem 0' }}>
      <div className="calendar-section">
        <div className="calendar-header">
          <button className="cal-nav" onClick={onPrev}>‹</button>
          <span className="cal-month-label">{monthLabel}</span>
          <button className="cal-nav" onClick={onNext}>›</button>
        </div>
        <div className="cal-grid">
          {DOW.map((d, i) => <div key={i} className={`cal-dow${i >= 5 ? ' cal-weekend' : ''}`}>{d}</div>)}
          {days.map((date, i) => {
            if (!date) return <div key={`e-${i}`} />
            const isToday = date.toDateString() === today.toDateString()
            const isWeekend = ((date.getDay() + 6) % 7) >= 5
            const dots = dotsByDay[date.toDateString()]
              ? ROOM_DEFS.filter(r => dotsByDay[date.toDateString()].has(r.id))
              : []
            return (
              <div key={date.toISOString()} className={`cal-day${isToday ? ' cal-today' : ''}`}>
                <span className={`cal-day-num${isWeekend ? ' cal-weekend' : ''}`}>{date.getDate()}</span>
                {dots.length > 0 && (
                  <div className="cal-dots">
                    {dots.map(r => <span key={r.id} className="cal-dot" style={{ background: r.color }} />)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <span className="calendar-decor calendar-decor-left" aria-hidden>🌳</span>
        <span className="calendar-decor calendar-decor-right" aria-hidden>🌸</span>
      </div>
    </div>
  )
}

/* ─── LEGEND ────────────────────────────────────────── */

function Legend() {
  return (
    <div className="legend-body">
      <div className="legend-group">
        <p className="legend-subtitle">Stanze</p>
        <div className="legend-rooms">
          {ROOM_DEFS.map(r => (
            <div key={r.id} className="legend-room-item">
              <span className="legend-dot" style={{ background: r.color }} />
              <span>{r.icon} {r.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="legend-group">
        <p className="legend-subtitle">Messaggi</p>
        <div className="legend-states">
          <div className="legend-state-item">
            <div className="legend-bubble legend-mine">▶ 0:24</div>
            <span>Tua nota vocale</span>
          </div>
          <div className="legend-state-item">
            <div className="legend-bubble legend-theirs">▶ 0:12</div>
            <span>Nota ricevuta</span>
          </div>
          <div className="legend-state-item">
            <div className="legend-bubble legend-upload"><span className="dot-pulse-sm" /> Invio</div>
            <span>In caricamento</span>
          </div>
        </div>
      </div>
    </div>
  )
}
