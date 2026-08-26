import { useState } from 'react'

export default function Login({ onSuccess }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!password || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      if (res.ok) {
        onSuccess()
      } else {
        const body = await res.json().catch(() => ({}))
        setError(body.error || 'Password errata')
      }
    } catch {
      setError('Errore di connessione. Riprova.')
    }
    setLoading(false)
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <span className="login-icon">🔒</span>
        <h1 className="login-title">Diario Vocale</h1>
        <p className="login-subtitle">Inserisci la password per accedere</p>
        <input
          className="login-input"
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        {error && <p className="login-error">{error}</p>}
        <button className="login-submit" type="submit" disabled={loading || !password}>
          {loading ? 'Accesso…' : 'Entra'}
        </button>
      </form>
    </div>
  )
}
