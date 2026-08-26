import { useState, useEffect, useRef, useMemo } from 'react'
import { io } from 'socket.io-client'

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

export default function Room({ roomDef, onLeave }) {
  const { code: roomCode, name, icon, color, colorDark, colorBg } = roomDef
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

  // Group notes by day, today always present, newest first
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
            style={{ '--room-color': color }}
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
                ? <span className="diary-note-count" style={{ color, background: `${color}22`, borderColor: `${color}44` }}>
                    {dayNotes.length} {dayNotes.length === 1 ? 'nota' : 'note'}
                  </span>
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

function DayView({ roomDef, dayKey, notes, myId, onBack, onNewNote }) {
  const { color } = roomDef
  const [isRecording, setIsRecording] = useState(false)
  const [uploading, setUploading] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [notes])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        if (blob.size > 0) await sendNote(blob)
      }
      mediaRecorderRef.current = mr
      mr.start()
      setIsRecording(true)
    } catch {
      alert('Permesso microfono negato.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
    setIsRecording(false)
  }

  const sendNote = async (blob) => {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('audio', blob, 'nota.webm')
      form.append('senderId', myId)
      const res = await fetch(`/api/rooms/${roomDef.code}/notes`, { method: 'POST', body: form })
      const note = await res.json()
      if (note?.id) onNewNote(note)
    } catch {
      alert("Errore durante l'invio. Riprova.")
    }
    setUploading(false)
  }

  const fileInputRef = useRef(null)

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    await sendNote(file)
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
        <div style={{ width: '34px' }} />
      </header>

      <div className="messages">
        {notes.length === 0 && !uploading && (
          <div className="empty-state">
            <div className="empty-icon">{roomDef.icon}</div>
            <p>Nessuna nota per questo giorno.</p>
            {isToday && (
              <>
                <p className="empty-hint">Tieni premuto il microfono per registrare.</p>
                <p className="empty-hint" style={{ color, marginTop: '0.5rem' }}>"{roomDef.prompt}"</p>
              </>
            )}
          </div>
        )}

        {notes.map(note => (
          <NoteMessage key={note.id} note={note} isMine={note.senderId === myId} color={color} />
        ))}

        {uploading && (
          <div className="message mine">
            <div className="bubble uploading-bubble">
              <span className="dot-pulse" />
              Invio in corso...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {isToday && (
        <div className="record-bar">
          <p className="record-hint">
            {isRecording ? 'Rilascia per salvare' : 'Tieni premuto per registrare'}
          </p>
          <div className="record-actions">
            <label className="btn-upload-file" title="Carica file audio (MP3, M4A, WAV…)">
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

function NoteMessage({ note, isMine, color }) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef(null)

  const bars = useMemo(
    () => Array.from({ length: 24 }, () => Math.random() * 20 + 4),
    [note.id]
  )

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

  const time = note.createdAt
    ? new Date(note.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    : ''

  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  return (
    <div className={`message ${isMine ? 'mine' : 'theirs'}`}>
      <div className="bubble" style={isMine ? { background: `${color}33`, borderColor: `${color}66` } : {}}>
        <audio
          ref={audioRef}
          src={note.audioUrl}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setProgress(0); setCurrentTime(0) }}
          onLoadedMetadata={e => setDuration(e.target.duration)}
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
                background: isMine ? color : 'var(--theirs-bar)',
                opacity: i / bars.length < progress ? 1 : 0.35
              }}
            />
          ))}
        </div>

        <div className="meta">
          <span className="dur">{duration ? fmt(playing ? currentTime : duration) : '—'}</span>
          <span className="ts">{time}</span>
        </div>
      </div>
    </div>
  )
}
