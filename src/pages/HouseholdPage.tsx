import { useEffect, useState } from 'react'
import { repo } from '../data'
import { useAuth } from '../lib/useAuth'
import type { Member, Role } from '../data/repo'

const ROLE_LABEL: Record<Role, string> = { owner: 'Besitzer', editor: 'Bearbeiter', viewer: 'Betrachter' }
const ROLE_CLASS: Record<Role, string> = {
  owner: 'text-rust border-rust',
  editor: 'text-sage border-sage',
  viewer: 'text-cream-soft border-line',
}

export default function HouseholdPage() {
  const { authState } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [copied, setCopied] = useState(false)

  const load = () => repo.listMembers().then(setMembers)

  useEffect(() => {
    if (repo.mode === 'cloud') load()
  }, [])

  if (repo.mode !== 'cloud') {
    return (
      <div className="pb-8">
        <div className="px-[18px] pb-2.5 pt-5">
          <h1 className="text-[21px] font-extrabold text-cream">Haushalt</h1>
        </div>
        <div className="mx-[18px] rounded-xl border border-dashed border-line p-6 text-center text-[12.5px] text-cream-soft">
          Du bist im Solo-Modus unterwegs – hier läuft alles nur lokal auf diesem Gerät. Um Rezepte, Vorrat und Einkaufsliste mit anderen zu teilen, richte den
          Verbunden-Modus ein (siehe SETUP.md aus deiner Auslieferung).
        </div>
      </div>
    )
  }

  const isOwner = authState?.currentRole === 'owner'
  const joinCode = authState?.household?.joinCode

  const setRole = async (m: Member, role: Role) => {
    await repo.setMemberRole(m.id, role)
    load()
  }

  const remove = async (m: Member) => {
    if (!confirm(`${m.displayName} wirklich aus dem Haushalt entfernen?`)) return
    await repo.removeMember(m.id)
    load()
  }

  const copyCode = async () => {
    if (!joinCode) return
    await navigator.clipboard.writeText(joinCode).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="pb-8">
      <div className="px-[18px] pb-2.5 pt-5">
        <h1 className="text-[21px] font-extrabold text-cream">Haushalt „{authState?.household?.name}"</h1>
      </div>
      <div className="px-[18px] pb-3 text-[12.5px] text-cream-soft">
        Beitritts-Code:{' '}
        <button onClick={copyCode} className="font-bold text-rust">
          {joinCode}
        </button>{' '}
        · teile ihn mit Freunden {copied && '(kopiert!)'}
      </div>

      <div className="px-[18px] pb-2 pt-4 text-[10.5px] font-bold uppercase tracking-wider text-rust">Mitglieder</div>
      {members.map((m) => (
        <div key={m.id} className="mx-[18px] mb-2 flex items-center justify-between rounded-[10px] border border-line bg-surface px-4 py-3.5 text-[13.5px] text-cream">
          <div>
            {m.displayName} {m.isYou && <span className="text-cream-soft">(du)</span>}
          </div>
          {isOwner && !m.isYou ? (
            <div className="flex items-center gap-2">
              <select
                value={m.role}
                onChange={(e) => setRole(m, e.target.value as Role)}
                className={`rounded-full border bg-transparent px-2.5 py-1 text-[10px] font-bold ${ROLE_CLASS[m.role]}`}
              >
                <option value="viewer">Betrachter</option>
                <option value="editor">Bearbeiter</option>
                <option value="owner">Besitzer</option>
              </select>
              <button onClick={() => remove(m)} className="text-[11px] text-cream-soft">
                Entfernen
              </button>
            </div>
          ) : (
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${ROLE_CLASS[m.role]}`}>{ROLE_LABEL[m.role]}</span>
          )}
        </div>
      ))}

      <div className="mx-[18px] mt-6 rounded-xl border border-line bg-surface p-4 text-[11.5px] leading-relaxed text-cream-soft">
        <b className="text-cream">Rollen:</b> Betrachter können alles ansehen, aber nichts ändern. Bearbeiter dürfen Rezepte, Vorrat und Einkaufsliste bearbeiten. Der
        Besitzer verwaltet zusätzlich die Mitgliederrollen.
      </div>
    </div>
  )
}
