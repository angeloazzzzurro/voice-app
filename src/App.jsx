import { useState, useEffect } from 'react'
import Home from './Home'
import Room from './Room'
import Guide from './Guide'
import Login from './Login'
import './App.css'

export default function App() {
  const [view, setView] = useState('home') // 'home' | 'room' | 'guide'
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [authenticated, setAuthenticated] = useState(null) // null = in verifica

  useEffect(() => {
    fetch('/api/session')
      .then(r => r.json())
      .then(d => setAuthenticated(!!d.authenticated))
      .catch(() => setAuthenticated(false))
  }, [])

  const logout = async () => {
    try { await fetch('/api/logout', { method: 'POST' }) } catch {}
    setView('home')
    setSelectedRoom(null)
    setAuthenticated(false)
  }

  if (authenticated === null) return null
  if (!authenticated) return <Login onSuccess={() => setAuthenticated(true)} />

  if (view === 'guide') return <Guide onBack={() => setView('home')} />
  if (view === 'room') return (
    <Room
      roomDef={selectedRoom}
      onLeave={() => setView('home')}
    />
  )
  return (
    <Home
      onEnterRoom={(roomDef) => { setSelectedRoom(roomDef); setView('room') }}
      onGuide={() => setView('guide')}
      onLogout={logout}
    />
  )
}
