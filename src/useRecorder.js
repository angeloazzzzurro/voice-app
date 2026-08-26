import { useState, useRef } from 'react'

/**
 * Hook per registrazione audio con supporto live analyser.
 * onComplete(blob, durationSeconds) viene chiamato quando la registrazione si ferma.
 */
export function useRecorder(onComplete) {
  const [isRecording, setIsRecording] = useState(false)
  const mrRef = useRef(null)
  const chunksRef = useRef([])
  const startRef = useRef(null)
  const analyserCtxRef = useRef(null)

  const start = async (onAnalyserReady) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // AudioContext per waveform live
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 64
        ctx.createMediaStreamSource(stream).connect(analyser)
        analyserCtxRef.current = { analyser, ctx }
        onAnalyserReady?.(analyser)
      } catch {}

      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        analyserCtxRef.current?.ctx.close().catch(() => {})
        analyserCtxRef.current = null
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const duration = startRef.current ? (Date.now() - startRef.current) / 1000 : null
        if (blob.size > 0) onComplete(blob, duration)
      }
      mrRef.current = mr
      startRef.current = Date.now()
      mr.start()
      setIsRecording(true)
    } catch {
      alert('Permesso microfono negato.')
    }
  }

  const stop = () => {
    if (mrRef.current?.state === 'recording') mrRef.current.stop()
    setIsRecording(false)
  }

  return { isRecording, start, stop }
}
