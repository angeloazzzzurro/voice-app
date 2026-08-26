import { useState, useEffect, useMemo } from 'react'
import { ROOM_DEFS } from './rooms'

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

export default function Home({ onEnterRoom, onGuide }) {
  const [roomCodes, setRoomCodes] = useState({})
  const [notesByRoom, setNotesByRoom] = useState({})
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d
  })
  const [loading, setLoading] = useState(true)

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
      if (!cancelled) {
        setRoomCodes(codes)
        setNotesByRoom(notes)
        setLoading(false)
      }
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

  const enterRoom = roomDef => {
    const code = roomCodes[roomDef.id]
    if (code) onEnterRoom({ ...roomDef, code })
  }

  return (
    <div className="home-diary">
      <header className="home-nav">
        <div className="home-nav-title">
          <span className="home-large-title">Diario Vocale</span>
          <span className="home-subtitle">Le tue note vocali</span>
        </div>
        <button className="btn-guide" onClick={onGuide}>Guida</button>
      </header>

      <div className="diary-scroll">
        <Calendar
          currentMonth={currentMonth}
          onPrev={() => setCurrentMonth(m => { const d = new Date(m); d.setMonth(d.getMonth()-1); return d })}
          onNext={() => setCurrentMonth(m => { const d = new Date(m); d.setMonth(d.getMonth()+1); return d })}
          dotsByDay={dotsByDay}
        />

        <div className="section-header">
          <span className="section-title">Stanze</span>
        </div>
        <div className="rooms-section">
          <div className="rooms-grid">
            {ROOM_DEFS.map(room => (
              <button
                key={room.id}
                className="room-card"
                style={{ '--room-color': room.color }}
                onClick={() => enterRoom(room)}
                disabled={loading || !roomCodes[room.id]}
              >
                <div className="room-card-icon">{room.icon}</div>
                <div className="room-card-body">
                  <span className="room-card-name">{room.name}</span>
                  <span className="room-card-desc">{room.description}</span>
                  <span className="room-card-prompt">"{room.prompt}"</span>
                </div>
                {countByRoom[room.id] > 0 && (
                  <div className="room-card-count">
                    <span className="room-note-badge">{countByRoom[room.id]}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="section-header">
          <span className="section-title">Legenda</span>
        </div>
        <div style={{ padding: '0 1rem' }}>
          <Legend />
        </div>
      </div>
    </div>
  )
}

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
          {DOW.map((d, i) => <div key={i} className="cal-dow">{d}</div>)}
          {days.map((date, i) => {
            if (!date) return <div key={`e-${i}`} />
            const isToday = date.toDateString() === today.toDateString()
            const dots = dotsByDay[date.toDateString()]
              ? ROOM_DEFS.filter(r => dotsByDay[date.toDateString()].has(r.id))
              : []
            return (
              <div key={date.toISOString()} className={`cal-day${isToday ? ' cal-today' : ''}`}>
                <span className="cal-day-num">{date.getDate()}</span>
                {dots.length > 0 && (
                  <div className="cal-dots">
                    {dots.map(r => <span key={r.id} className="cal-dot" style={{ background: r.color }} />)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

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
