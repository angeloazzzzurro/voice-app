export default function Landing({ onEnter }) {
  return (
    <main className="lp">

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div className="lp-hero-text">
            <p className="lp-eyebrow">Diario Vocale</p>
            <h1 className="lp-hero-title">Il tuo diario.<br />La tua voce.</h1>
            <p className="lp-hero-sub">
              Registra pensieri, emozioni e momenti in stanze create da te. Privato, istantaneo, tuo.
            </p>
            <button className="lp-btn-primary" onClick={onEnter}>
              Inizia gratis
            </button>
            <p className="lp-hero-note">Accesso con Google · Gratis · Dati privati</p>
          </div>

          <div className="lp-phone" aria-hidden="true">
            <div className="lp-phone-frame">
              <div className="lp-phone-bar" />
              <div className="lp-phone-content">
                <div className="lp-phone-header">
                  <span className="lp-ph-title">Diario Vocale</span>
                  <span className="lp-ph-streak">🔥 3</span>
                </div>
                <div className="lp-phone-rooms">
                  <div className="lp-ph-room lp-ph-room-a">
                    <span>🔮</span><span>Riflessione</span>
                    <span className="lp-ph-badge">4</span>
                  </div>
                  <div className="lp-ph-room lp-ph-room-b">
                    <span>🌿</span><span>Gratitudine</span>
                    <span className="lp-ph-badge">2</span>
                  </div>
                  <div className="lp-ph-room lp-ph-room-c">
                    <span>🌙</span><span>Sogni</span>
                  </div>
                  <div className="lp-ph-room lp-ph-room-add">
                    <span>＋</span><span>Aggiungi stanza</span>
                  </div>
                </div>
                <div className="lp-phone-fab-row">
                  <div className="lp-phone-fab">🎤</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="lp-section" aria-labelledby="features-title">
        <div className="lp-section-inner">
          <p className="lp-eyebrow">Funzionalità</p>
          <h2 className="lp-section-title" id="features-title">Semplice come parlare</h2>
          <div className="lp-features">
            {[
              { icon: '🎙', title: 'Registra in un secondo', desc: 'Tieni premuto il microfono, parla, rilascia. La nota è salvata.' },
              { icon: '🗂', title: 'Stanze personalizzate', desc: 'Crea gli spazi che vuoi tu — nome, emoji e colore.' },
              { icon: '📅', title: 'Diario per giorno', desc: 'Rivedi ogni giornata con il calendario. I momenti restano.' },
              { icon: '🔒', title: 'Solo tuo', desc: 'Accesso con Google. Nessuno può leggere le tue note.' },
            ].map(f => (
              <div key={f.title} className="lp-feature">
                <div className="lp-feature-icon" aria-hidden="true">{f.icon}</div>
                <div className="lp-feature-body">
                  <strong>{f.title}</strong>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STANZE ── */}
      <section className="lp-section lp-section-blue" aria-labelledby="rooms-title">
        <div className="lp-section-inner">
          <p className="lp-eyebrow">Le stanze</p>
          <h2 className="lp-section-title" id="rooms-title">Creale come vuoi tu</h2>
          <p className="lp-section-desc">
            Nessuna categoria imposta. Aggiungi una stanza, dagli un'emoji e un colore — e il tuo spazio è pronto.
          </p>
          <div className="lp-rooms">
            {[
              { icon: '🔮', name: 'Riflessione' },
              { icon: '🌿', name: 'Gratitudine' },
              { icon: '🔥', name: 'Sfogo' },
              { icon: '🌙', name: 'Sogni' },
            ].map(r => (
              <div key={r.name} className="lp-room-pill">
                <span aria-hidden="true">{r.icon}</span>
                <span>{r.name}</span>
              </div>
            ))}
            <button className="lp-room-pill lp-room-add" onClick={onEnter}>
              <span aria-hidden="true">＋</span>
              <span>La tua</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="lp-cta" aria-labelledby="cta-title">
        <h2 className="lp-cta-title" id="cta-title">Pronto a iniziare?</h2>
        <p className="lp-cta-sub">Registra il tuo primo momento adesso.</p>
        <button className="lp-btn-primary" onClick={onEnter}>
          Apri il diario 🎤
        </button>
      </section>

    </main>
  )
}
