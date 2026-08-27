import { useState, useEffect } from 'react'
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth'
import { auth } from './firebase'
import Home from './Home'
import Room from './Room'
import Guide from './Guide'
import Stats from './Stats'
import Landing from './Landing'
import Onboarding from './Onboarding'
import './App.css'

const googleProvider = new GoogleAuthProvider()

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = caricamento
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [view, setView] = useState('home')
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [notesByRoom, setNotesByRoom] = useState({})

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setUser(u ?? null)
      if (u && !localStorage.getItem('onboarding-done')) setShowOnboarding(true)
    })
  }, [])

  // Promemoria notifiche
  useEffect(() => {
    if (Notification.permission !== 'granted') return
    const t = localStorage.getItem('reminder-time')
    if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return
    const schedule = () => {
      const [h, m] = t.split(':').map(Number)
      if (isNaN(h) || isNaN(m) || h > 23 || m > 59) return
      const now = new Date()
      const next = new Date(now)
      next.setHours(h, m, 0, 0)
      if (next <= now) next.setDate(next.getDate() + 1)
      return setTimeout(() => {
        new Notification('📔 Diario Vocale', { body: 'Hai registrato oggi? 🎤' })
        schedule()
      }, next - now)
    }
    const id = schedule()
    return () => clearTimeout(id)
  }, [])

  const signIn = () => signInWithPopup(auth, googleProvider).catch(console.error)
  const signOutUser = () => signOut(auth)

  // Caricamento auth
  if (user === undefined) return (
    <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1B1563' }}>
      <div className="loading-disc" style={{ width: 32, height: 32, borderWidth: 3 }} />
    </div>
  )

  // Non loggato → Landing
  if (!user) return <Landing onEnter={signIn} />

  // Primo accesso → Onboarding
  if (showOnboarding) return <Onboarding onDone={() => setShowOnboarding(false)} />

  if (view === 'guide') return <Guide onBack={() => setView('home')} />
  if (view === 'stats') return (
    <Stats notesByRoom={notesByRoom} onBack={() => setView('home')} />
  )
  if (view === 'room') return (
    <Room
      roomDef={selectedRoom}
      uid={user.uid}
      onLeave={() => setView('home')}
    />
  )
  return (
    <Home
      uid={user.uid}
      user={user}
      onEnterRoom={roomDef => { setSelectedRoom(roomDef); setView('room') }}
      onGuide={() => setView('guide')}
      onStats={() => setView('stats')}
      onNotesLoaded={setNotesByRoom}
      onSignOut={signOutUser}
    />
  )
}
