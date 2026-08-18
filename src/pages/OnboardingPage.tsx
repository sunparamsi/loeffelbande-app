import { useState } from 'react'
import { repo } from '../data'
import { useAuth } from '../lib/AuthContext'
import { TextInput, PrimaryButton } from '../components/ui'

type Tab = 'create' | 'join' | 'login'

export default function OnboardingPage() {
  const { refresh } = useAuth()
  const [tab, setTab] = useState<Tab>('create')
  const [householdName, setHouseholdName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const result =
        tab === 'create'
          ? await repo.createHousehold(householdName, name, pin)
          : tab === 'join'
            ? await repo.joinHousehold(joinCode, name, pin)
            : await repo.loginExistingMember(joinCode, name, pin)
      if (result.ok) {
        await refresh()
      } else {
        setError(result.error)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center px-6 py-10">
      <div className="mb-1 text-2xl font-extrabold text-cream">Löffelbande</div>
      <div className="mb-8 text-[13px] text-cream-soft">Verbunden-Modus – gemeinsam mit deinem Haushalt kochen.</div>

      <div className="mb-6 flex gap-2">
        {(['create', 'join', 'login'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t)
              setError(null)
            }}
            className={`flex-1 rounded-full border py-2 text-xs font-bold ${tab === t ? 'border-rust bg-rust/10 text-rust' : 'border-line text-cream-soft'}`}
          >
            {t === 'create' ? 'Erstellen' : t === 'join' ? 'Beitreten' : 'Anmelden'}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {tab === 'create' && (
          <div>
            <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-cream-soft">Haushaltsname</div>
            <TextInput value={householdName} onChange={(e) => setHouseholdName(e.target.value)} placeholder="z. B. WG Küche" />
          </div>
        )}
        {tab !== 'create' && (
          <div>
            <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-cream-soft">Beitritts-Code</div>
            <TextInput value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="z. B. 7F3KQ2" />
          </div>
        )}
        <div>
          <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-cream-soft">Dein Name</div>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Lucas" />
        </div>
        <div>
          <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-cream-soft">PIN (mind. 6 Zeichen)</div>
          <TextInput value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••••" type="password" />
        </div>

        {error && <div className="rounded-2xl border border-rust/40 bg-rust/10 px-3.5 py-2.5 text-[12px] text-rust">{error}</div>}

        <PrimaryButton className="mt-2 w-full" onClick={submit} disabled={busy}>
          {busy ? 'Einen Moment…' : tab === 'create' ? 'Haushalt erstellen' : tab === 'join' ? 'Beitreten' : 'Anmelden'}
        </PrimaryButton>
      </div>

      <div className="mt-8 text-center text-[11px] text-cream-soft">
        Noch kein Cloud-Setup? Lies SETUP.md aus deiner App-Auslieferung für die Schritt-für-Schritt-Anleitung.
      </div>
    </div>
  )
}
