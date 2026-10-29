import QRCode from 'qrcode'
import { useEffect, useRef, useState } from 'react'
import type { Prompteur, ReglagesPrompteur, Script } from '../../../shared/types'
import { BarreHaut } from '../composants/Coquille'
import { Icone } from '../composants/Icone'
import { Pastille } from './Bienvenue'

const MOTS_PAR_MINUTE = 150

const mots = (t: string) => t.replace(/^#.*$/gm, '').split(/\s+/).filter(Boolean).length

export function Tournage() {
  const [scripts, setScripts] = useState<Script[]>([])
  const [actif, setActif] = useState<string | null>(null)
  const [prompteur, setPrompteur] = useState<Prompteur | null>(null)

  const charger = async () => {
    const s = await window.cliplex.scripts.lister()
    setScripts(s)
    setActif((a) => (a && s.some((x) => x.id === a) ? a : (s[0]?.id ?? null)))
  }
  useEffect(() => {
    charger()
  }, [])

  // Le téléphone suit le script choisi dans la liste.
  useEffect(() => {
    if (prompteur && actif && prompteur.script !== actif) window.cliplex.prompteur.ouvrir(actif).then(setPrompteur)
  }, [actif, prompteur])

  const script = scripts.find((s) => s.id === actif)
  const nouveau = async () => {
    const s = await window.cliplex.scripts.creer('Nouveau script')
    setScripts((l) => [s, ...l])
    setActif(s.id)
  }
  const remplacer = (s: Script) => setScripts((l) => l.map((x) => (x.id === s.id ? s : x)))
  const supprimer = async (id: string) => {
    await window.cliplex.scripts.supprimer(id)
    if (prompteur?.script === id) {
      await window.cliplex.prompteur.arreter()
      setPrompteur(null)
    }
    await charger()
  }

  return (
    <>
      <BarreHaut>
        <div className="flex min-w-0 items-center gap-2 text-[13px] text-muet">
          Tournage
          {script && (
            <>
              <Icone nom="chevron" taille={14} />
              <b className="truncate font-semibold text-encre">{script.titre}</b>
            </>
          )}
        </div>
        <div className="ml-auto flex gap-2">
          <button className="btn-noir" onClick={nouveau}>
            <Icone nom="plus" />
            Nouveau script
          </button>
        </div>
      </BarreHaut>

      <div className="flex min-h-0 flex-1">
        <div className="w-[260px] flex-none overflow-y-auto border-r border-bord bg-white p-2.5">
          {scripts.length === 0 && <p className="p-3 text-[12.5px] leading-normal text-muet">Aucun script pour l'instant. Crée le premier avec « Nouveau script ».</p>}
          {scripts.map((s) => (
            <button key={s.id} onClick={() => setActif(s.id)} className={`mb-0.5 w-full rounded-lg px-3 py-2.5 text-left ${s.id === actif ? 'bg-violet-fond' : 'hover:bg-fond'}`}>
              <div className={`truncate text-[13px] font-semibold ${s.id === actif ? 'text-violet-fonce' : ''}`}>{s.titre}</div>
              <div className="mt-0.5 text-[11.5px] text-muet">
                {mots(s.texte)} mots · {new Date(s.majLe).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </div>
            </button>
          ))}
        </div>
        {script ? (
          <>
            <Editeur key={script.id} script={script} onChange={remplacer} onSupprimer={() => supprimer(script.id)} />
            <Panneau script={script} prompteur={prompteur} onPrompteur={setPrompteur} />
          </>
        ) : (
          <Vide onCreer={nouveau} />
        )}
      </div>
    </>
  )
}

function Vide({ onCreer }: { onCreer: () => void }) {
  return (
    <div className="grid flex-1 place-items-center">
      <div className="max-w-sm text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-violet-fond text-violet">
          <Icone nom="telephone" taille={22} />
        </span>
        <h2 className="mt-4 text-[18px] font-bold">Ton prompteur</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muet">Écris ou colle ton script, puis ouvre-le sur ton téléphone : le texte défile en grand pendant que tu parles face caméra.</p>
        <button className="btn-noir mt-5" onClick={onCreer}>
          <Icone nom="plus" />
          Nouveau script
        </button>
      </div>
    </div>
  )
}

function Editeur({ script, onChange, onSupprimer }: { script: Script; onChange: (s: Script) => void; onSupprimer: () => void }) {
  const [titre, setTitre] = useState(script.titre)
  const [texte, setTexte] = useState(script.texte)
  const [etat, setEtat] = useState<'enregistre' | 'attente'>('enregistre')
  const [confirmer, setConfirmer] = useState(false)
  const minuteur = useRef<ReturnType<typeof setTimeout>>(undefined)
  const champTitre = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!script.texte && script.titre === 'Nouveau script') champTitre.current?.select()
  }, [])

  // Enregistrement automatique, peu après la dernière frappe : le téléphone reçoit le texte à jour.
  const modifier = (partiel: { titre?: string; texte?: string }) => {
    if (partiel.titre !== undefined) setTitre(partiel.titre)
    if (partiel.texte !== undefined) setTexte(partiel.texte)
    setEtat('attente')
    clearTimeout(minuteur.current)
    const suite = { titre: (partiel.titre ?? titre).trim() || 'Sans titre', texte: partiel.texte ?? texte }
    minuteur.current = setTimeout(async () => {
      onChange(await window.cliplex.scripts.modifier(script.id, suite))
      setEtat('enregistre')
    }, 500)
  }

  const n = mots(texte)
  const minutes = n / MOTS_PAR_MINUTE
  const duree = n === 0 ? '' : minutes < 1 ? `moins d'une minute` : `environ ${Math.round(minutes)} min`

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-white">
      <div className="flex items-center gap-3 px-10 pt-8">
        <input ref={champTitre} value={titre} onChange={(e) => modifier({ titre: e.target.value })} placeholder="Titre du script" className="min-w-0 flex-1 bg-transparent text-[22px] font-bold tracking-[-0.02em] outline-none placeholder:text-doux" />
        {confirmer ? (
          <div className="flex gap-1.5">
            <button className="btn-fantome" onClick={() => setConfirmer(false)}>
              Annuler
            </button>
            <button className="btn-blanc text-[#B42318]" onClick={onSupprimer}>
              Mettre à la corbeille
            </button>
          </div>
        ) : (
          <button className="btn-fantome" onClick={() => setConfirmer(true)} title="Mettre ce script à la corbeille">
            <Icone nom="poubelle" />
          </button>
        )}
      </div>
      <textarea
        value={texte}
        onChange={(e) => modifier({ texte: e.target.value })}
        placeholder={'Écris ou colle ton script ici.\n\nUne ligne vide sépare les paragraphes.\n# Une ligne qui commence par # marque une partie.'}
        className="min-h-0 flex-1 resize-none bg-transparent px-10 py-5 text-[15px] leading-[1.7] text-encre outline-none placeholder:text-doux"
        spellCheck
      />
      <div className="flex items-center gap-3 border-t border-bord-2 px-10 py-3 text-[12px] text-muet">
        <span>
          {n} mot{n > 1 ? 's' : ''}
          {duree && ` · ${duree} de lecture à ${MOTS_PAR_MINUTE} mots par minute`}
        </span>
        <span className="ml-auto">{etat === 'attente' ? 'Enregistrement…' : 'Enregistré'}</span>
      </div>
    </div>
  )
}

function Panneau({ script, prompteur, onPrompteur }: { script: Script; prompteur: Prompteur | null; onPrompteur: (p: Prompteur | null) => void }) {
  const [qr, setQr] = useState('')
  const [reglages, setReglages] = useState<ReglagesPrompteur | null>(null)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    if (!prompteur?.telephone) return setQr('')
    QRCode.toString(prompteur.telephone, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#1B1A21', light: '#FFFFFF' } }).then(setQr)
  }, [prompteur?.telephone])

  // Les réglages changés depuis le téléphone se retrouvent ici.
  useEffect(() => {
    const lire = () => window.cliplex.prompteur.reglages().then(setReglages)
    lire()
    const t = setInterval(lire, 2000)
    return () => clearInterval(t)
  }, [])

  const ouvrir = async () => {
    setErreur('')
    try {
      onPrompteur(await window.cliplex.prompteur.ouvrir(script.id))
    } catch (e) {
      setErreur((e as Error).message.replace(/^Error invoking remote method '[^']+': (Error: )?/, ''))
    }
  }
  const arreter = async () => {
    await window.cliplex.prompteur.arreter()
    onPrompteur(null)
  }
  const regler = async (partiel: Partial<ReglagesPrompteur>) => {
    setReglages((r) => (r ? { ...r, ...partiel } : r))
    setReglages(await window.cliplex.prompteur.ecrireReglages(partiel))
  }

  return (
    <aside className="flex w-[340px] flex-none flex-col gap-3 overflow-y-auto border-l border-bord bg-fond p-4">
      <div className="carte p-4">
        <div className="flex items-center gap-2">
          <b className="text-[14px] font-semibold">Sur ton téléphone</b>
          {prompteur && <Pastille ton="ok">Ouvert</Pastille>}
        </div>
        {!prompteur && (
          <>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muet">Cliplex ouvre une petite page sur ton Wi-Fi. Tu la scannes avec l'appareil photo du téléphone, et ton script s'y affiche en grand.</p>
            <button className="btn-violet mt-3.5 w-full" onClick={ouvrir}>
              <Icone nom="telephone" />
              Ouvrir sur mon téléphone
            </button>
            {erreur && <p className="mt-2 text-[12px] text-[#B42318]">{erreur}</p>}
          </>
        )}
        {prompteur && !prompteur.telephone && (
          <p className="mt-2 text-[12.5px] leading-relaxed text-muet">Ton Mac n'est connecté à aucun réseau. Connecte-le au même Wi-Fi que ton téléphone, puis rouvre le prompteur.</p>
        )}
        {prompteur?.telephone && (
          <>
            <div className="mx-auto mt-3.5 w-[180px] rounded-lg border border-bord bg-white p-3">
              {qr && <img src={`data:image/svg+xml;utf8,${encodeURIComponent(qr)}`} alt="QR code du prompteur" className="block w-full" />}
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-muet">Scanne ce code avec l'appareil photo de ton téléphone. Il doit être sur le même Wi-Fi que ton Mac.</p>
            <p className="mt-2 select-text break-all font-mono text-[11px] text-doux">{prompteur.telephone}</p>
          </>
        )}
        {prompteur && (
          <div className="mt-3.5 flex gap-2">
            <button className="btn-fantome -ml-2" onClick={() => window.cliplex.prompteur.fenetre(script.id)}>
              Ouvrir sur ce Mac
            </button>
            <button className="btn-fantome ml-auto -mr-2" onClick={arreter}>
              Fermer
            </button>
          </div>
        )}
        {!prompteur && (
          <button className="btn-fantome -ml-2 mt-1.5" onClick={() => window.cliplex.prompteur.fenetre(script.id).then(() => window.cliplex.prompteur.ouvrir(script.id)).then(onPrompteur)}>
            Ou l'ouvrir dans une fenêtre de ce Mac
          </button>
        )}
      </div>

      {reglages && (
        <div className="carte p-4">
          <b className="text-[14px] font-semibold">Réglages</b>
          <p className="mt-1 text-[12px] text-muet">Changent en direct, ici ou sur le téléphone.</p>
          <Curseur nom="Vitesse" valeur={reglages.vitesse} min={0.5} max={10} pas={0.5} onChange={(vitesse) => regler({ vitesse })} />
          <Curseur nom="Taille du texte" valeur={reglages.taille} min={24} max={160} pas={2} onChange={(taille) => regler({ taille })} />
          <label className="mt-4 flex cursor-pointer items-center gap-3">
            <span className="flex-1">
              <b className="block text-[12.5px] font-semibold">Miroir</b>
              <span className="text-[12px] text-muet">Pour une vitre de prompteur</span>
            </span>
            <button role="switch" aria-checked={reglages.miroir} onClick={() => regler({ miroir: !reglages.miroir })} className={`relative h-[22px] w-[38px] rounded-full transition-colors ${reglages.miroir ? 'bg-violet' : 'bg-[#D4D4D8]'}`}>
              <i className={`absolute top-[3px] h-4 w-4 rounded-full bg-white transition-all ${reglages.miroir ? 'left-[19px]' : 'left-[3px]'}`} />
            </button>
          </label>
        </div>
      )}

      <div className="carte p-4">
        <b className="text-[14px] font-semibold">Pendant le tournage</b>
        <ul className="mt-2 space-y-1.5 text-[12.5px] leading-relaxed text-muet">
          <li>Touche l'écran pour lancer, touche encore pour faire une pause.</li>
          <li>Glisse le doigt pour revenir en arrière ou avancer.</li>
          <li>Garde ton téléphone allumé : coupe sa mise en veille pendant que tu tournes.</li>
          <li>Sur le Mac : espace pour lancer, flèches pour la vitesse, M pour le miroir.</li>
        </ul>
      </div>

      <div className="carte p-4 opacity-80">
        <div className="flex items-center gap-2">
          <Icone nom="micro" className="text-muet" />
          <b className="text-[14px] font-semibold">Guidé par ta voix</b>
          <Pastille ton="g">Bientôt</Pastille>
        </div>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muet">Le texte avancera au rythme de ta voix, reconnue sur ton Mac, et t'attendra quand tu t'arrêtes.</p>
      </div>
    </aside>
  )
}

function Curseur({ nom, valeur, min, max, pas, onChange }: { nom: string; valeur: number; min: number; max: number; pas: number; onChange: (v: number) => void }) {
  return (
    <label className="mt-4 block">
      <span className="flex items-baseline">
        <b className="text-[12.5px] font-semibold">{nom}</b>
        <span className="ml-auto font-mono text-[12px] text-muet">{valeur.toLocaleString('fr-FR')}</span>
      </span>
      <input type="range" min={min} max={max} step={pas} value={valeur} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-violet" />
    </label>
  )
}
