import { useState } from 'react'

const SLIDES = [
  {
    icon: '🎤',
    title: 'Registra in un secondo',
    desc: 'Tieni premuto il microfono e parla. Rilascia per salvare. Niente tastiera, niente frizioni.',
  },
  {
    icon: '🗂',
    title: 'Le tue stanze, le tue regole',
    desc: 'Crea spazi diversi per ogni parte della tua vita — riflessioni, sogni, sfoghi. Dagli un nome e un\'emoji.',
  },
  {
    icon: '📅',
    title: 'Ogni giorno, per sempre',
    desc: 'Il calendario tiene traccia di quando hai registrato. Torna a riascoltare qualsiasi momento.',
  },
]

export default function Onboarding({ onDone }) {
  const [idx, setIdx] = useState(0)
  const slide = SLIDES[idx]
  const isLast = idx === SLIDES.length - 1

  const next = () => {
    if (isLast) {
      localStorage.setItem('onboarding-done', '1')
      onDone()
    } else {
      setIdx(i => i + 1)
    }
  }

  const skip = () => {
    localStorage.setItem('onboarding-done', '1')
    onDone()
  }

  return (
    <div className="onb">
      <button className="onb-skip" onClick={skip}>Salta</button>

      <div className="onb-body">
        <div className="onb-icon" aria-hidden="true">{slide.icon}</div>
        <h1 className="onb-title">{slide.title}</h1>
        <p className="onb-desc">{slide.desc}</p>
      </div>

      <div className="onb-footer">
        <div className="onb-dots" aria-label={`Slide ${idx + 1} di ${SLIDES.length}`}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={`onb-dot${i === idx ? ' onb-dot-active' : ''}`}
              onClick={() => setIdx(i)}
              aria-label={`Vai alla slide ${i + 1}`}
            />
          ))}
        </div>
        <button className="onb-btn" onClick={next}>
          {isLast ? 'Inizia →' : 'Avanti'}
        </button>
      </div>
    </div>
  )
}
