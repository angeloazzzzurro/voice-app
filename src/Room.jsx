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

export default function Room({ roomCode, onLeave }) {
  const [notes, setNotes] = useState([])
  const [isRecording, setIsRecording] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [copied, setCopied] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const bottomRef = useRef(null)
  const myId = useMemo(() => getMyId(), [])

  useEffect(() => {
    // Carica note esistenti
    fetch(`/api/rooms/${roomCode}`)
      .then(r => r.json())
      .then(d => setNotes(d.notes || []))

    // Connessione socket per note in tempo reale
    const socket = io()
    socket.emit('join-room', roomCode)
    socket.on('new-note', note => {
      setNotes(prev => [...prev, note])
    })

    return () => socket.disconnect()
  }, [roomCode])

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
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
  }

  const sendNote = async (blob) => {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('audio', blob, 'nota.webm')
      form.append('senderId', myId)
      await fetch(`/api/rooms/${roomCode}/notes`, { method: 'POST', body: form })
    } catch {
      alert("Errore durante l'invio. Riprova.")
    }
    setUploading(false)
  }

  const shareUrl = window.location.href

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="room">
      <header className="room-header">
        <button className="btn-icon" onClick={onLeave}>&#8592;</button>
        <div className="room-title">
          <span className="room-label">Stanza</span>
          <span className="room-code-display">{roomCode}</span>
        </div>
        <button className="btn-share" onClick={copyLink}>
          {copied ? '✓ Copiato' : 'Condividi link'}
        </button>
      </header>

      <div className="messages">
        {notes.length === 0 && !uploading && (
          <div className="empty-state">
            <div className="empty-icon">🎙️</div>
            <p>Nessuna nota ancora.</p>
            <p className="empty-hint">Tieni premuto il microfono per registrare la tua prima nota.</p>
            <div className="share-box">
              <p>Condividi questo link con chi ami:</p>
              <div className="share-code" onClick={copyLink}>
                {shareUrl}
                <span>{copied ? ' copiato!' : ' — tocca per copiare'}</span>
              </div>
            </div>
          </div>
        )}

        {notes.map(note => (
          <NoteMessage key={note.id} note={note} isMine={note.senderId === myId} />
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

      <div className="record-bar">
        <p className="record-hint">
          {isRecording ? 'Rilascia per inviare' : 'Tieni premuto per registrare'}
        </p>
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
      </div>
    </div>
  )
}

function NoteMessage({ note, isMine }) {
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
      <div className="bubble">
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
              style={{ height: `${h}px`, opacity: i / bars.length < progress ? 1 : 0.35 }}
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
