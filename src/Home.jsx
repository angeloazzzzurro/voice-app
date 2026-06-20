import { useState } from 'react'

export default function Home({ onEnterRoom }) {
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const createRoom = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/rooms', { method: 'POST' })
      const { code } = await res.json()
      onEnterRoom(code)
    } catch {
      setError('Errore di rete. Assicurati che il server sia avviato.')
    }
    setLoading(false)
  }

  const joinRoom = async () => {
    const code = joinCode.toUpperCase().trim()
    if (!code) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/rooms/${code}`)
      if (!res.ok) {
        setError('Stanza non trovata. Controlla il codice.')
        setLoading(false)
        return
      }
      onEnterRoom(code)
    } catch {
      setError('Errore di rete. Assicurati che il server sia avviato.')
    }
    setLoading(false)
  }

  return (
    <div className="home">
      <div className="home-card">
        <div className="logo">🎙️</div>
        <h1>Vicini da lontano</h1>
        <p className="subtitle">Mandatevi note vocali, anche a distanza.</p>

        <button className="btn btn-primary" onClick={createRoom} disabled={loading}>
          {loading ? 'Creazione...' : 'Crea una stanza'}
        </button>

        <div className="divider"><span>oppure entra con un codice</span></div>

        <div className="join-row">
          <input
            type="text"
            placeholder="Codice stanza (es. A1B2C3)"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            maxLength={8}
            onKeyDown={e => e.key === 'Enter' && joinRoom()}
          />
          <button className="btn btn-outline" onClick={joinRoom} disabled={loading || !joinCode.trim()}>
            Entra
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        <p className="footer-hint">
          Crea una stanza e condividi il codice con la persona che ami.
        </p>
      </div>
    </div>
  )
}
