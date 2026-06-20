import { useState, useEffect } from 'react'
import Home from './Home'
import Room from './Room'
import './App.css'

export default function App() {
  // Legge il codice stanza dall'URL: es. http://.../#ABC123
  const [roomCode, setRoomCode] = useState(() => {
    const hash = window.location.hash.replace('#', '').trim().toUpperCase()
    return hash || null
  })

  const enterRoom = (code) => {
    window.location.hash = code
    setRoomCode(code)
  }

  const leaveRoom = () => {
    window.location.hash = ''
    setRoomCode(null)
  }

  // Aggiorna lo stato se l'hash cambia (es. tasto indietro del browser)
  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.replace('#', '').trim().toUpperCase()
      setRoomCode(hash || null)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return roomCode
    ? <Room roomCode={roomCode} onLeave={leaveRoom} />
    : <Home onEnterRoom={enterRoom} />
}
