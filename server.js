import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import multer from 'multer'
import cors from 'cors'
import { randomBytes, createHash, timingSafeEqual } from 'crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlink } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin: true, credentials: true } })

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

// Serve audio files
if (!existsSync('uploads')) mkdirSync('uploads')

// Simple JSON data store
const DATA_FILE = join(__dirname, 'data.json')
let data = { rooms: {} }
if (existsSync(DATA_FILE)) {
  try { data = JSON.parse(readFileSync(DATA_FILE, 'utf8')) } catch {}
}
const save = () => writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))

// ── Autenticazione ──────────────────────────────────────
//
// Il diario è pensato per un solo proprietario: una singola password
// condivisa protegge l'intera app (API, socket, file audio). Il codice
// stanza a 6 caratteri resta solo un identificatore interno, non è più
// l'unico segreto necessario per leggere/scrivere.

const PASSWORD_FILE = join(__dirname, 'PASSWORD.txt')
const SESSION_COOKIE = 'voice_session'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 giorni

let APP_PASSWORD = process.env.APP_PASSWORD
if (!APP_PASSWORD) {
  if (existsSync(PASSWORD_FILE)) {
    APP_PASSWORD = readFileSync(PASSWORD_FILE, 'utf8').trim()
  } else {
    APP_PASSWORD = randomBytes(9).toString('base64url')
    writeFileSync(PASSWORD_FILE, APP_PASSWORD + '\n')
  }
  console.log(`\n  🔑  Password d'accesso al diario: ${APP_PASSWORD}`)
  console.log(`      (salvata anche in ${PASSWORD_FILE})\n`)
}

function safeCompare(a, b) {
  const ah = createHash('sha256').update(a).digest()
  const bh = createHash('sha256').update(b).digest()
  return timingSafeEqual(ah, bh)
}

const sessions = new Map() // token -> expiresAt

function createSession() {
  const token = randomBytes(32).toString('hex')
  sessions.set(token, Date.now() + SESSION_TTL_MS)
  return token
}

function isValidSession(token) {
  if (!token) return false
  const expiresAt = sessions.get(token)
  if (!expiresAt) return false
  if (Date.now() > expiresAt) { sessions.delete(token); return false }
  return true
}

function parseCookies(req) {
  const header = req.headers.cookie
  const cookies = {}
  if (!header) return cookies
  header.split(';').forEach(pair => {
    const idx = pair.indexOf('=')
    if (idx === -1) return
    cookies[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim())
  })
  return cookies
}

function requireAuth(req, res, next) {
  const cookies = parseCookies(req)
  if (!isValidSession(cookies[SESSION_COOKIE])) {
    return res.status(401).json({ error: 'Non autenticato' })
  }
  next()
}

// Rate limiting sui tentativi di login (per IP)
const LOGIN_MAX_ATTEMPTS = 5
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const loginAttempts = new Map() // ip -> { count, resetAt }

function isLockedOut(ip) {
  const entry = loginAttempts.get(ip)
  if (!entry) return false
  if (Date.now() > entry.resetAt) { loginAttempts.delete(ip); return false }
  return entry.count >= LOGIN_MAX_ATTEMPTS
}

function registerFailedLogin(ip) {
  const entry = loginAttempts.get(ip)
  if (!entry || Date.now() > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: Date.now() + LOGIN_WINDOW_MS })
  } else {
    entry.count++
  }
}

app.post('/api/login', (req, res) => {
  const ip = req.ip
  if (isLockedOut(ip)) {
    return res.status(429).json({ error: 'Troppi tentativi. Riprova più tardi.' })
  }
  const { password } = req.body || {}
  if (typeof password !== 'string' || !safeCompare(password, APP_PASSWORD)) {
    registerFailedLogin(ip)
    return res.status(401).json({ error: 'Password errata' })
  }
  loginAttempts.delete(ip)
  const token = createSession()
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure,
    maxAge: SESSION_TTL_MS,
    path: '/'
  })
  res.json({ ok: true })
})

app.post('/api/logout', (req, res) => {
  const cookies = parseCookies(req)
  sessions.delete(cookies[SESSION_COOKIE])
  res.clearCookie(SESSION_COOKIE, { path: '/' })
  res.json({ ok: true })
})

app.get('/api/session', (req, res) => {
  const cookies = parseCookies(req)
  res.json({ authenticated: isValidSession(cookies[SESSION_COOKIE]) })
})

app.use('/uploads', requireAuth, express.static(join(__dirname, 'uploads')))

// Multer: save audio to uploads/ (webm dalla registrazione, mp3/m4a/wav dall'upload)
const ALLOWED_AUDIO = ['webm', 'mp3', 'm4a', 'wav', 'ogg', 'aac', 'flac']
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (_, file, cb) => {
    const parts = file.originalname.split('.')
    const ext = parts.length > 1 ? parts.pop().toLowerCase() : 'webm'
    cb(null, `${Date.now()}-${randomBytes(4).toString('hex')}.${ext}`)
  }
})
const upload = multer({
  storage,
  fileFilter: (_, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase()
    cb(null, file.mimetype.startsWith('audio/') || ALLOWED_AUDIO.includes(ext))
  }
})

// ── API ──────────────────────────────────────────────

app.use('/api/rooms', requireAuth)

// Crea stanza
app.post('/api/rooms', (req, res) => {
  const code = randomBytes(3).toString('hex').toUpperCase()
  data.rooms[code] = { createdAt: Date.now(), notes: [] }
  save()
  res.json({ code })
})

// Controlla se la stanza esiste
app.get('/api/rooms/:code', (req, res) => {
  const room = data.rooms[req.params.code]
  if (!room) return res.status(404).json({ error: 'Stanza non trovata' })
  res.json({ exists: true, notes: room.notes })
})

// Carica nota vocale
app.post('/api/rooms/:code/notes', upload.single('audio'), (req, res) => {
  const room = data.rooms[req.params.code]
  if (!room) return res.status(404).json({ error: 'Stanza non trovata' })

  const note = {
    id: Date.now().toString(),
    senderId: req.body.senderId,
    audioUrl: `/uploads/${req.file.filename}`,
    createdAt: Date.now(),
    duration: req.body.duration ? parseFloat(req.body.duration) : null
  }
  room.notes.push(note)
  save()

  io.to(req.params.code).emit('new-note', note)
  res.json(note)
})

// Elimina nota vocale
app.delete('/api/rooms/:code/notes/:id', (req, res) => {
  const room = data.rooms[req.params.code]
  if (!room) return res.status(404).json({ error: 'Stanza non trovata' })
  const idx = room.notes.findIndex(n => n.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Nota non trovata' })
  const [note] = room.notes.splice(idx, 1)
  save()
  unlink(join(__dirname, note.audioUrl), () => {})
  res.json({ ok: true })
})

// ── Socket.io ─────────────────────────────────────────

io.use((socket, next) => {
  const cookies = parseCookies(socket.request)
  if (!isValidSession(cookies[SESSION_COOKIE])) {
    return next(new Error('Non autenticato'))
  }
  next()
})

io.on('connection', socket => {
  socket.on('join-room', code => socket.join(code))
})

// ── Serve frontend in produzione ─────────────────────

const distPath = join(__dirname, 'dist')
if (existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('/{*splat}', (_, res) => res.sendFile(join(distPath, 'index.html')))
}

// ── Start ─────────────────────────────────────────────

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`\n  Server avviato su http://localhost:${PORT}\n`)
})

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  ❌  Porta ${PORT} gia' in uso!`)
    console.error(`  Chiudi l'altra sessione e riprova, oppure esegui:`)
    console.error(`  npx kill-port ${PORT}\n`)
  } else {
    console.error(err)
  }
  process.exit(1)
})
