let audioContext: AudioContext | null = null
let audioUnlocked = false
let notificationAudio: HTMLAudioElement | null = null

function createNotificationAudioElement(): HTMLAudioElement {
  const sampleRate = 44100
  const duration = 3
  const numSamples = Math.floor(sampleRate * duration)
  const buffer = new ArrayBuffer(44 + numSamples * 2)
  const view = new DataView(buffer)

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + numSamples * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, numSamples * 2, true)

  for (let i = 0; i < numSamples; i += 1) {
    const t = i / sampleRate
    const pulseIndex = Math.floor(t / 0.75)
    const pulseTime = t - pulseIndex * 0.75
    const freq = pulseIndex % 2 === 0 ? 880 : 1100
    const attack = Math.min(1, pulseTime * 30)
    const release = Math.max(0, 1 - Math.max(0, pulseTime - 0.45) * 8)
    const envelope = attack * release
    const sample = Math.sin(2 * Math.PI * freq * pulseTime) * envelope * 0.3
    view.setInt16(44 + i * 2, sample * 0x7fff, true)
  }

  const blob = new Blob([buffer], { type: 'audio/wav' })
  const audio = new Audio(URL.createObjectURL(blob))
  audio.preload = 'auto'
  return audio
}

export async function unlockChatNotificationAudio(): Promise<boolean> {
  if (typeof window === 'undefined') return false

  try {
    if (!notificationAudio) {
      notificationAudio = createNotificationAudioElement()
    }

    const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (AudioCtx && !audioContext) {
      audioContext = new AudioCtx()
    }

    if (audioContext?.state === 'suspended') {
      await audioContext.resume()
    }

    notificationAudio.currentTime = 0
    await notificationAudio.play()
    notificationAudio.pause()
    notificationAudio.currentTime = 0
    audioUnlocked = true
    return true
  } catch {
    return false
  }
}

export async function playChatNotificationSound(): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    if (!audioUnlocked) {
      const unlocked = await unlockChatNotificationAudio()
      if (!unlocked) return
    }

    if (!notificationAudio) {
      notificationAudio = createNotificationAudioElement()
    }

    notificationAudio.currentTime = 0
    await notificationAudio.play()
  } catch (error) {
    console.warn('Could not play chat notification sound', error)
  }
}
