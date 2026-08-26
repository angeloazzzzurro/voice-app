import { ROOM_DEFS } from './rooms'

export default function Guide({ onBack }) {
  return (
    <div className="guide">
      <header className="nav-bar">
        <button className="btn-icon" onClick={onBack}>&#8592;</button>
        <div className="nav-title-block">
          <span className="nav-title">Guida al Diario</span>
          <span className="nav-eyebrow">Come iniziare</span>
        </div>
        <div style={{ width: '34px' }} />
      </header>

      <div className="guide-scroll">

        <section className="guide-section">
          <h2>📼 Come funziona</h2>
          <p>Registra pensieri, emozioni e momenti con la voce. Puoi usare il microfono direttamente nell'app oppure caricare file audio registrati altrove.</p>
          <div className="guide-steps">
            <div className="guide-step"><span className="step-num">1</span><span>Scegli una stanza dalla home</span></div>
            <div className="guide-step"><span className="step-num">2</span><span>Seleziona il giorno (oggi è sempre in cima)</span></div>
            <div className="guide-step"><span className="step-num">3</span><span>Tieni premuto 🎤 per registrare, oppure tocca 📎 per caricare un file</span></div>
            <div className="guide-step"><span className="step-num">4</span><span>Le note sono organizzate automaticamente per giorno e stanza</span></div>
          </div>
        </section>

        <section className="guide-section">
          <h2>🎙️ Come registrare note vocali</h2>
          <div className="guide-steps">
            <div className="guide-step">
              <span className="step-num">A</span>
              <span><strong>Direttamente nell'app</strong> — tieni premuto il tasto 🎤 e parla. Rilascia per salvare.</span>
            </div>
            <div className="guide-step">
              <span className="step-num">B</span>
              <span><strong>App del telefono</strong> — usa Memo Vocali (iOS) o Registratore Vocale (Android), poi carica il file con 📎.</span>
            </div>
            <div className="guide-step">
              <span className="step-num">C</span>
              <span><strong>Suggerimento</strong> — dai un titolo provvisorio al file subito dopo la registrazione (es. <em>"2026-08-26-gratitudine.m4a"</em>).</span>
            </div>
          </div>
        </section>

        <section className="guide-section">
          <h2>📎 Come caricare file audio</h2>
          <p>Entra in una stanza, seleziona il giorno e tocca il tasto 📎 accanto al microfono. Seleziona il file dal dispositivo — viene caricato automaticamente.</p>
          <div className="guide-steps">
            <div className="guide-step"><span className="step-num">1</span><span>Entra nella stanza e apri il giorno corretto</span></div>
            <div className="guide-step"><span className="step-num">2</span><span>Tocca 📎 e scegli il file audio dal dispositivo</span></div>
            <div className="guide-step"><span className="step-num">3</span><span>Attendi il caricamento — la nota appare nella lista</span></div>
          </div>
        </section>

        <section className="guide-section">
          <h2>🎵 Formati audio supportati</h2>
          <p>Funzionano senza problemi i formati comuni:</p>
          <div className="guide-steps">
            <div className="guide-step"><span className="step-num">✓</span><span><strong>MP3</strong> — formato universale, ideale per condivisione</span></div>
            <div className="guide-step"><span className="step-num">✓</span><span><strong>M4A</strong> — formato nativo iOS (Memo Vocali)</span></div>
            <div className="guide-step"><span className="step-num">✓</span><span><strong>WAV</strong> — massima qualità, file più pesanti</span></div>
            <div className="guide-step"><span className="step-num">✓</span><span><strong>OGG / AAC / FLAC</strong> — supportati</span></div>
            <div className="guide-step"><span className="step-num">!</span><span>Se un file non si riproduce, convertilo in MP3 (128–192 kbps) e ricarica</span></div>
          </div>
        </section>

        <section className="guide-section">
          <h2>🗂️ Le 5 stanze</h2>
          <div className="guide-rooms">
            {ROOM_DEFS.map(room => (
              <div
                key={room.id}
                className="guide-room-card"
                style={{ '--room-color': room.color, borderLeftColor: room.color }}
              >
                <div className="guide-room-header">
                  <span className="guide-room-icon">{room.icon}</span>
                  <span className="guide-room-name" style={{ color: room.color }}>{room.name}</span>
                </div>
                <p className="guide-room-desc">{room.description}</p>
                <p className="guide-room-when"><strong>Quando usarla:</strong> {whenToUse(room.id)}</p>
                <div className="guide-examples">
                  {room.examples.map((ex, i) => (
                    <span key={i} className="guide-example">"{ex}"</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="guide-section">
          <h2>🔊 Consigli per la qualità audio</h2>
          <ul className="guide-tips">
            <li><strong>Ambiente silenzioso</strong> — attiva la modalità aereo per evitare notifiche durante la registrazione.</li>
            <li><strong>Distanza</strong> — tieni il microfono a 10–20 cm dalla bocca; parla chiaro e a volume costante.</li>
            <li><strong>Durata ideale</strong> — 1–3 minuti è perfetto per riascolto e riflessione.</li>
            <li><strong>Naming</strong> — se carichi file esterni, usa lo schema <em>"AAAA-MM-GG Stanza - Titolo"</em> (es. "2026-08-26 Gratitudine - Tre cose.mp3").</li>
            <li><strong>Tecnico</strong> — evita sfregamenti sul microfono; se possibile registra a 44.1 kHz in mono.</li>
          </ul>
        </section>

        <section className="guide-section">
          <h2>💡 Consigli pratici</h2>
          <ul className="guide-tips">
            <li>Registra anche solo <strong>30 secondi</strong> al giorno — la costanza conta più della lunghezza.</li>
            <li>Non filtrarti. Parla come stai pensando, non come vorresti sembrare.</li>
            <li>Riascolta le note vecchie una volta a settimana — ti sorprenderà quanto cambi.</li>
            <li>Usa <strong>Sogni</strong> appena sveglio/a, prima che i sogni svaniscano.</li>
            <li>Negli <strong>Sfoghi</strong> non c'è niente di sbagliato — è un posto sicuro.</li>
            <li>Il <strong>Calendario</strong> mostra i pattern: quali giorni registri di più? In quali stanze?</li>
          </ul>
        </section>

        <section className="guide-section">
          <h2>✨ Idee creative</h2>
          <div className="guide-ideas">
            <div className="guide-idea">
              <span className="idea-icon">🌅</span>
              <div>
                <strong>Morning pages vocali</strong>
                <p>Ogni mattina, 2 minuti in Riflessione. Parla senza censura appena sveglio/a.</p>
              </div>
            </div>
            <div className="guide-idea">
              <span className="idea-icon">📅</span>
              <div>
                <strong>Recap settimanale</strong>
                <p>Ogni domenica, usa Quotidiano per riassumere la settimana in 1 minuto.</p>
              </div>
            </div>
            <div className="guide-idea">
              <span className="idea-icon">🙏</span>
              <div>
                <strong>3 grazie al giorno</strong>
                <p>Prima di dormire, registra 3 cose per cui sei grato/a in Gratitudine.</p>
              </div>
            </div>
            <div className="guide-idea">
              <span className="idea-icon">🌙</span>
              <div>
                <strong>Dream journal</strong>
                <p>Telefono sul comodino. Appena sveglio/a, registra il sogno prima che sparisca.</p>
              </div>
            </div>
            <div className="guide-idea">
              <span className="idea-icon">💨</span>
              <div>
                <strong>Valvola di sfogo</strong>
                <p>Prima di rispondere a qualcosa che ti fa arrabbiare, sfogati qui. Poi decidi.</p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}

function whenToUse(id) {
  return {
    riflessione: 'Quando hai un pensiero che non riesci a toglierti dalla testa, o vuoi capire come ti senti davvero.',
    quotidiano:  'Ogni sera per raccontare la giornata, o quando succede qualcosa che vale la pena ricordare.',
    gratitudine: 'La mattina o la sera, per ancorarti al positivo e riconoscere le piccole cose belle.',
    sogni:       'Appena sveglio/a per catturare i sogni, o quando hai un desiderio che vuoi tenere vivo.',
    sfoghi:      'Quando sei sopraffatto/a, arrabbiato/a o frustrato/a e hai bisogno di tirare fuori tutto.',
  }[id]
}
