import { useState, useEffect, useRef, useMemo } from 'react'
import { io } from 'socket.io-client'
import { useRecorder } from './useRecorder'

function getMyId() {
  let id = localStorage.getItem('voice-notes-uid')
  if (!id) {
    id = Math.random().toString(36).substring(2) + Date.now().toString(36)
    localStorage.setItem('voice-notes-uid', id)
  }
  return id
}

function getDayLabel(dateStr) {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Oggi'
  if (d.toDateString() === yesterday.toDateString()) return 'Ieri'
  return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
}

function fmtDur(s) {
  if (!s) return '—'
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

export default function Room({ roomDef, onLeave }) {
  const { code: roomCode, name, icon, color } = roomDef
  const [notes, setNotes] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)
  const myId = useMemo(() => getMyId(), [])

  useEffect(() => {
    fetch(`/api/rooms/${roomCode}`)
      .then(r => r.json())
      .then(d => setNotes(d.notes || []))

    const socket = io()
    socket.emit('join-room', roomCode)
    socket.on('new-note', note => setNotes(prev => [...prev, note]))
    return () => socket.disconnect()
  }, [roomCode])

  const days = useMemo(() => {
    const groups = {}
    notes.forEach(note => {
      if (!note.createdAt) return
      const key = new Date(note.createdAt).toDateString()
      if (!groups[key]) groups[key] = []
      groups[key].push(note)
    })
    const todayKey = new Date().toDateString()
    if (!groups[todayKey]) groups[todayKey] = []
    return Object.entries(groups).sort((a, b) => new Date(b[0]) - new Date(a[0]))
  }, [notes])

  const deleteNote = (noteId) => setNotes(prev => prev.filter(n => n.id !== noteId))

  if (selectedDay !== null) {
    const dayNotes = days.find(([k]) => k === selectedDay)?.[1] || []
    return (
      <DayView
        roomDef={roomDef}
        dayKey={selectedDay}
        notes={dayNotes}
        myId={myId}
        onBack={() => setSelectedDay(null)}
        onNewNote={note => setNotes(prev => [...prev, note])}
        onDeleteNote={deleteNote}
      />
    )
  }

  return (
    <div className="room" style={{ '--room-color': color }}>
      <header className="nav-bar">
        <button className="btn-icon" onClick={onLeave}>&#8592;</button>
        <div className="nav-title-block">
          <span className="nav-eyebrow">Diario</span>
          <span className="nav-title-colored" style={{ color }}>{icon} {name}</span>
        </div>
        <div style={{ width: '34px' }} />
      </header>

      <div className="diary-list">
        {days.map(([dayKey, dayNotes]) => (
          <button
            key={dayKey}
            className="diary-day-card"
            onClick={() => setSelectedDay(dayKey)}
          >
            <div className="diary-day-left">
              <span className="diary-day-label">{getDayLabel(dayKey)}</span>
              <span className="diary-day-date">
                {new Date(dayKey).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div className="diary-day-right">
              {dayNotes.length > 0
                ? <span className="diary-note-count">{dayNotes.length} {dayNotes.length === 1 ? 'nota' : 'note'}</span>
                : <span className="diary-note-empty">Nessuna nota</span>
              }
              <span className="diary-arrow" style={{ color }}>›</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─── DAY VIEW ──────────────────────────────────────── */

function DayView({ roomDef, dayKey, notes, myId, onBack, onNewNote, onDeleteNote }) {
  const { color } = roomDef
  const [uploading, setUploading] = useState(false)
  const [liveBars, setLiveBars] = useState([])
  const [playAllIdx, setPlayAllIdx] = useState(-1)
  const rafRef = useRef(null)
  const fileInputRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [notes])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  // Stop play-all if notes change
  useEffect(() => { setPlayAllIdx(-1) }, [dayKey])

  const uploadNote = async (fileOrBlob, duration) => {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('audio', fileOrBlob, fileOrBlob.name || 'nota.webm')
      form.append('senderId', myId)
      if (duration != null) form.append('duration', duration.toFixed(2))
      const res = await fetch(`/api/rooms/${roomDef.code}/notes`, { method: 'POST', body: form })
      const note = await res.json()
      if (note?.id) onNewNote(note)
    } catch {
      alert("Errore durante l'invio. Riprova.")
    }
    setUploading(false)
  }

  const { isRecording, start, stop } = useRecorder(async (blob, duration) => {
    cancelAnimationFrame(rafRef.current)
    setLiveBars([])
    await uploadNote(blob, duration)
  })

  const startRecording = async () => {
    await start((analyser) => {
      const tick = () => {
        const data = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(data)
        setLiveBars(Array.from(data).map(v => Math.max(3, (v / 255) * 28)))
        rafRef.current = requestAnimationFrame(tick)
      }
      tick()
    })
  }

  const stopRecording = () => {
    cancelAnimationFrame(rafRef.current)
    stop()
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    let duration = null
    try {
      duration = await new Promise(resolve => {
        const a = new Audio()
        a.onloadedmetadata = () => resolve(a.duration)
        a.onerror = () => resolve(null)
        a.src = URL.createObjectURL(file)
      })
    } catch {}
    await uploadNote(file, duration)
  }

  const handleDelete = async (noteId) => {
    try {
      await fetch(`/api/rooms/${roomDef.code}/notes/${noteId}`, { method: 'DELETE' })
      onDeleteNote(noteId)
      if (playAllIdx >= 0) setPlayAllIdx(-1)
    } catch {
      alert("Errore durante l'eliminazione.")
    }
  }

  const handlePlayAll = () => {
    if (playAllIdx >= 0) { setPlayAllIdx(-1); return }
    if (notes.length > 0) setPlayAllIdx(0)
  }

  const handleAutoEnd = (idx) => {
    const next = idx + 1
    setPlayAllIdx(next < notes.length ? next : -1)
  }

  const isToday = dayKey === new Date().toDateString()

  return (
    <div className="room" style={{ '--room-color': color }}>
      <header className="nav-bar">
        <button className="btn-icon" onClick={onBack}>&#8592;</button>
        <div className="nav-title-block">
          <span className="nav-title">{getDayLabel(dayKey)}</span>
          <span className="nav-eyebrow">
            {new Date(dayKey).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
        {notes.length > 1 ? (
          <button className="btn-play-all" onClick={handlePlayAll} style={{ color }}>
            {playAllIdx >= 0 ? '⏹' : '▶▶'}
          </button>
        ) : (
          <div style={{ width: '34px' }} />
        )}
      </header>

      <div className="messages">
        {notes.length === 0 && !uploading && (
          <div className="empty-state">
            <div className="empty-icon">{roomDef.icon}</div>
            <p>Nessuna nota per questo giorno.</p>
            {isToday && (
              <>
                <p className="empty-hint">Tieni premuto 🎤 per registrare.</p>
                <p className="empty-hint" style={{ color, marginTop: '0.3rem' }}>"{roomDef.prompt}"</p>
              </>
            )}
          </div>
        )}

        {notes.map((note, idx) => (
          <NoteMessage
            key={note.id}
            note={note}
            isMine={note.senderId === myId}
            color={color}
            autoPlay={playAllIdx === idx}
            onAutoEnd={() => handleAutoEnd(idx)}
            onDelete={handleDelete}
          />
        ))}

        {uploading && (
          <div className="message mine">
            <div className="bubble uploading-bubble">
              <span className="dot-pulse" />
              Salvataggio...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {isToday && (
        <div className="record-bar">
          {isRecording && liveBars.length > 0 ? (
            <div className="live-waveform">
              {liveBars.map((h, i) => (
                <div key={i} className="live-bar" style={{ height: `${h}px`, background: color }} />
              ))}
            </div>
          ) : (
            <p className="record-hint">
              {isRecording ? 'Rilascia per salvare' : 'Tieni premuto per registrare'}
            </p>
          )}
          <div className="record-actions">
            <label className="btn-upload-file" title="Carica file audio">
              📎
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac,.flac"
                onChange={handleFileUpload}
                hidden
                disabled={uploading || isRecording}
              />
            </label>
            <button
              className={isRecording ? 'btn-mic recording' : 'btn-mic'}
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={e => { e.preventDefault(); startRecording() }}
              onTouchEnd={e => { e.preventDefault(); stopRecording() }}
              disabled={uploading}
            >
              {isRecording ? '⏹' : '🎤'}
            </button>
            <div style={{ width: '42px' }} />
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── NOTE MESSAGE ──────────────────────────────────── */

function NoteMessage({ note, isMine, color, autoPlay, onAutoEnd, onDelete }) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(note.duration || 0)
  const [currentTime, setCurrentTime] = useState(0)
  const [swipeX, setSwipeX] = useState(0)
  const audioRef = useRef(null)
  const touchRef = useRef({ x: 0, y: 0, tracking: false })

  const bars = useMemo(
    () => Array.from({ length: 24 }, () => Math.random() * 20 + 4),
    [note.id]
  )

  // Auto-play quando è il turno
  useEffect(() => {
    if (autoPlay && audioRef.current) {
      audioRef.current.play().catch(() => onAutoEnd?.())
    }
  }, [autoPlay])

  const toggle = () => {
    if (!audioRef.current) return
    playing ? audioRef.current.pause() : audioRef.current.play()
  }

  const seek = (e) => {
    if (!audioRef.current || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    audioRef.current.currentTime = pct * duration
  }

  // Swipe to delete
  const onTouchStart = e => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, tracking: true }
  }

  const onTouchMove = e => {
    if (!touchRef.current.tracking) return
    const dx = e.touches[0].clientX - touchRef.current.x
    const dy = Math.abs(e.touches[0].clientY - touchRef.current.y)
    if (dy > 12 && Math.abs(dx) < dy) { touchRef.current.tracking = false; return }
    if (dx < 0) {
      setSwipeX(Math.max(dx, -72))
      e.preventDefault()
    } else if (swipeX < 0) {
      setSwipeX(Math.min(0, swipeX + dx))
    }
  }

  const onTouchEnd = () => {
    touchRef.current.tracking = false
    setSwipeX(s => s < -36 ? -72 : 0)
  }

  const time = note.createdAt
    ? new Date(note.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div
      className={`message ${isMine ? 'mine' : 'theirs'}`}
      style={{
        transform: `translateX(${swipeX}px)`,
        transition: (swipeX === 0 || swipeX === -72) ? 'transform 0.2s ease' : 'none',
        position: 'relative'
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="bubble"
        style={isMine ? { background: `${color}30`, borderColor: `${color}50` } : {}}
      >
        <audio
          ref={audioRef}
          src={note.audioUrl}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false); setProgress(0); setCurrentTime(0)
            if (autoPlay) onAutoEnd?.()
          }}
          onLoadedMetadata={e => { if (!note.duration) setDuration(e.target.duration) }}
          onTimeUpdate={e => {
            setCurrentTime(e.target.currentTime)
            setProgress(e.target.currentTime / (e.target.duration || 1))
          }}
        />

        <button className="play-btn" onClick={toggle}>
          {playing ? '⏸' : '▶'}
        </button>

        <div className="waveform" onClick={seek}>
          {bars.map((h, i) => (
            <div
              key={i}
              className="bar"
              style={{
                height: `${h}px`,
                background: isMine ? color : 'rgba(255,255,255,0.5)',
                opacity: i / bars.length < progress ? 1 : 0.35
              }}
            />
          ))}
        </div>

        <div className="meta">
          <span className="dur">{duration ? fmtDur(playing ? currentTime : duration) : '—'}</span>
          <span className="ts">{time}</span>
        </div>
      </div>

      {swipeX <= -36 && (
        <button
          className="swipe-delete-btn"
          onClick={() => onDelete(note.id)}
          style={{ opacity: Math.min(1, Math.abs(swipeX) / 72) }}
        >
          🗑
        </button>
      )}
    </div>
  )
}
