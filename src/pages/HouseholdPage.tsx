import { useEffect, useState } from 'react'
import { repo } from '../data'
import { useAuth } from '../lib/useAuth'
import type { Member, Role } from '../data/repo'
import ConfirmModal from '../components/ConfirmModal'

const ROLE_LABEL: Record<Role, string> = { owner: 'Besitzer', editor: 'Bearbeiter', viewer: 'Betrachter' }
const ROLE_CLASS: Record<Role, string> = {
  owner: 'text-rust border-rust bg-[color-mix(in_srgb,var(--color-rust)_12%,white)]',
  editor: 'text-sage border-sage bg-[color-mix(in_srgb,var(--color-sage)_12%,white)]',
  viewer: 'text-cream-soft border-line bg-surface-2',
}

export default function HouseholdPage() {
  const { authState } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [copied, setCopied] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null)

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
        <div className="mx-[18px] rounded-2xl border border-dashed border-line p-6 text-center text-[12.5px] text-cream-soft">
          Du bist im Solo-Modus unterwegs – hier läuft alles nur lokal auf diesem Gerät. Um Rezepte und Einkaufsliste mit anderen zu teilen, richte den
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

  const confirmRemove = async () => {
    if (!memberToRemove) return
    await repo.removeMember(memberToRemove.id)
    setMemberToRemove(null)
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
        <div key={m.id} className="mx-[18px] mb-2 flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3.5 text-[13.5px] text-cream shadow-card-sm">
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
              <button onClick={() => setMemberToRemove(m)} className="text-[11px] text-cream-soft">
                Entfernen
              </button>
            </div>
          ) : (
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${ROLE_CLASS[m.role]}`}>{ROLE_LABEL[m.role]}</span>
          )}
        </div>
      ))}

      <div className="mx-[18px] mt-6 rounded-2xl border border-line bg-surface p-4 text-[11.5px] leading-relaxed text-cream-soft shadow-card-sm">
        <b className="text-cream">Rollen:</b> Betrachter können alles ansehen, aber nichts ändern. Bearbeiter dürfen Rezepte anlegen und die Einkaufsliste bearbeiten – ein
        Rezept bearbeiten oder löschen dürfen sie aber nur, wenn sie es selbst angelegt haben. Der Besitzer darf zusätzlich jedes Rezept bearbeiten/löschen und verwaltet die
        Mitgliederrollen.
      </div>

      {memberToRemove && (
        <ConfirmModal
          title="Mitglied entfernen"
          message={`${memberToRemove.displayName} wirklich aus dem Haushalt entfernen?`}
          confirmLabel="Entfernen"
          danger
          onConfirm={confirmRemove}
          onCancel={() => setMemberToRemove(null)}
        />
      )}
    </div>
  )
}
