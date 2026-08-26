import { useState } from 'react'
import Home from './Home'
import Room from './Room'
import Guide from './Guide'
import './App.css'

export default function App() {
  const [view, setView] = useState('home') // 'home' | 'room' | 'guide'
  const [selectedRoom, setSelectedRoom] = useState(null)

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
    />
  )
}
