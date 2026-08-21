/** Kurze Animation beim Öffnen der App (ähnlich einem nativen App-Splash-Screen):
 * das Topf-Motiv blendet groß und ohne Icon-Rahmen ein, und ein paar kleine
 * "Bubble"-Punkte lassen die Suppe im Topf leicht simmern/blubbern. `exiting`
 * steuert das Ausblenden, sobald die App tatsächlich bereit ist – siehe
 * useSplashGate in App.tsx. splash-icon.png ist die vom Nutzer gelieferte,
 * bereits freigestellte Version (transparent, ohne Icon-Kachel/Glow). */

// Position der Blubber-Punkte als Prozent-Koordinaten relativ zur Grafik (in
// den schmalen Lücken zwischen den vier Löffelgriffen, auf Höhe der
// Suppenoberfläche) – per Pixelvermessung der aktuellen Grafik ermittelt,
// damit die Punkte wirklich innerhalb des Topfrands bleiben statt daneben.
const BUBBLES = [
  { left: '11%', top: '23%', size: '1.5%', delay: '-0.2s', duration: '1.9s' },
  { left: '34.6%', top: '23%', size: '2%', delay: '-1.1s', duration: '2.2s' },
  { left: '45.1%', top: '22.5%', size: '2.4%', delay: '-0.6s', duration: '1.7s' },
  { left: '58.7%', top: '23%', size: '2%', delay: '-1.6s', duration: '2.4s' },
  { left: '69.8%', top: '23.5%', size: '1.6%', delay: '-0.9s', duration: '2s' },
]

export default function SplashScreen({ exiting }: { exiting: boolean }) {
  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-bg ${exiting ? 'splash-exit' : ''}`}>
      <div
        className="splash-mark relative w-[82vw] max-w-[420px]"
        style={{ aspectRatio: '2200 / 1721', filter: 'drop-shadow(0 18px 34px rgba(0,0,0,0.22))' }}
      >
        <img src="/splash-icon.png" alt="Löffelbande" className="h-full w-full object-contain" />
        {BUBBLES.map((b, i) => (
          <span
            key={i}
            className="splash-bubble absolute rounded-full"
            style={{
              left: b.left,
              top: b.top,
              width: b.size,
              height: b.size,
              animationDelay: b.delay,
              animationDuration: b.duration,
              background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.95), rgba(255,238,214,0.55) 70%, rgba(255,238,214,0) 100%)',
            }}
          />
        ))}
      </div>
      <div className="splash-text text-[20px] font-extrabold tracking-tight text-rust-solid">Löffelbande</div>
    </div>
  )
}
