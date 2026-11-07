import { useEffect, useRef, useState } from 'react'
import { isbnFromBarcode } from '#/lib/isbn'

// the Barcode Detection API isn't in TypeScript's DOM types yet
interface DetectedBarcode {
  rawValue: string
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>
}
type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorLike

function barcodeDetector(): BarcodeDetectorCtor | null {
  return (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector ?? null
}

/** Chrome on Android reads barcodes itself; most desktop browsers and iPhones don't (yet). */
export function canScanBarcodes() {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && !!barcodeDetector()
}

type Problem = 'unsupported' | 'denied' | 'no-camera'

const PROBLEM_TEXT: Record<Problem, string> = {
  unsupported:
    "This browser can't read barcodes. Chrome on an Android phone can. Here, type the ISBN from under the barcode in the ISBN tab.",
  denied: 'The camera is blocked for this site. Allow it in the browser settings (the icon next to the address), then try again.',
  'no-camera': "No camera was found. Type the ISBN from under the barcode in the ISBN tab.",
}

interface Props {
  /** called with each new ISBN seen; the same book isn't reported twice in a row */
  onIsbn: (isbn: string) => void
  /** stop looking while a found book is being shown */
  paused?: boolean
}

/**
 * The back camera, reading the EAN-13 barcode on the back of a book (#19).
 * Keeps scanning, so several books can be added one after another.
 */
export function BarcodeScanner({ onIsbn, paused = false }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const [problem, setProblem] = useState<Problem | null>(() => (canScanBarcodes() ? null : 'unsupported'))
  const [ready, setReady] = useState(false)
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  const onIsbnRef = useRef(onIsbn)
  onIsbnRef.current = onIsbn

  useEffect(() => {
    if (problem) return
    const Detector = barcodeDetector()!
    const detector = new Detector({ formats: ['ean_13'] })
    let stream: MediaStream | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    let stopped = false
    let last = { isbn: '', at: 0 }

    const tick = async () => {
      if (stopped) return
      const v = video.current
      if (v && v.readyState >= 2 && !pausedRef.current) {
        try {
          for (const code of await detector.detect(v)) {
            const isbn = isbnFromBarcode(code.rawValue)
            // the same barcode stays in view for a while: report it once
            if (isbn && (isbn !== last.isbn || Date.now() - last.at > 4000)) {
              last = { isbn, at: Date.now() }
              navigator.vibrate?.(60)
              onIsbnRef.current(isbn)
              break
            }
          }
        } catch {
          /* a frame that couldn't be read; try the next */
        }
      }
      timer = setTimeout(tick, 200)
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false })
      .then((s) => {
        if (stopped) return s.getTracks().forEach((t) => t.stop())
        stream = s
        const v = video.current!
        v.srcObject = s
        return v.play().then(() => {
          setReady(true)
          tick()
        })
      })
      .catch((e: unknown) => {
        const name = e instanceof DOMException ? e.name : ''
        setProblem(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'no-camera')
      })

    return () => {
      stopped = true
      clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [problem])

  if (problem) return <p className="scan-problem">{PROBLEM_TEXT[problem]}</p>

  return (
    <div className={paused ? 'scanner paused' : 'scanner'}>
      <video ref={video} muted playsInline aria-label="Camera" />
      <div className="scanner-frame" aria-hidden="true" />
      <p className="scanner-hint">{ready ? 'Point the camera at the barcode on the back of a book.' : 'Starting the camera…'}</p>
    </div>
  )
}
