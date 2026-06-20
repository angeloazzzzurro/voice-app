import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import multer from 'multer'
import cors from 'cors'
import { randomBytes } from 'crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin: '*' } })

app.use(cors())
app.use(express.json())

// Serve audio files
if (!existsSync('uploads')) mkdirSync('uploads')
app.use('/uploads', express.static(join(__dirname, 'uploads')))

// Simple JSON data store
const DATA_FILE = join(__dirname, 'data.json')
let data = { rooms: {} }
if (existsSync(DATA_FILE)) {
  try { data = JSON.parse(readFileSync(DATA_FILE, 'utf8')) } catch {}
}
const save = () => writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))

// Multer: save audio to uploads/
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (_, __, cb) => cb(null, `${Date.now()}-${randomBytes(4).toString('hex')}.webm`)
})
const upload = multer({ storage })

// ── API ──────────────────────────────────────────────

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
    createdAt: Date.now()
  }
  room.notes.push(note)
  save()

  io.to(req.params.code).emit('new-note', note)
  res.json(note)
})

// ── Socket.io ─────────────────────────────────────────

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
