import { useEffect, useRef, useState } from 'react'
import type { EtatChrome, EtatClaude, LigneJournal, Objectif, Outil, Reglages } from '../../../shared/types'
import { Icone, type NomIcone } from '../composants/Icone'
import { Logo } from '../composants/Logo'
import { ZoneInspirations } from './Inspirations'

const ETAPES = [
  { titre: 'Ce qu’il te faut', duree: '20 s' },
  { titre: 'Ce que tu veux faire', duree: '20 s' },
  { titre: 'Ton dossier Cliplex', duree: '10 s' },
  { titre: 'Installation des outils', duree: '5 min' },
  { titre: 'Connexion à Claude', duree: '1 min' },
  { titre: 'Tes inspirations', duree: '5 min' }
]
const DERNIERE = ETAPES.length - 1

const OBJECTIFS: { id: Objectif; icone: NomIcone; titre: string; texte: string }[] = [
  { id: 'formation', icone: 'formation', titre: 'Faire des formations', texte: 'Vidéos 16:9 avec chapitres, encarts, captures d’écran et schémas.' },
  { id: 'youtube', icone: 'youtube', titre: 'YouTube', texte: 'Face caméra, rythmé, avec les zooms et les textes qui t’aident à expliquer.' },
  { id: 'courts', icone: 'vertical', titre: 'Shorts, Reels, TikTok', texte: 'Formats verticaux courts, rythmés, prêts à publier.' },
  { id: 'montage', icone: 'lecture', titre: 'Monter vite', texte: 'Tu déposes ton rush déjà coupé, Cliplex fait le montage.' },
  { id: 'planification', icone: 'calendrier', titre: 'Planifier mes contenus', texte: 'Idées, scripts et calendrier de publication. Bientôt.' },
  { id: 'tournage', icone: 'telephone', titre: 'Tourner avec le prompteur', texte: 'Ton script qui défile en grand sur ton téléphone pendant que tu parles.' }
]

export function Bienvenue({ reglages, onFini }: { reglages: Reglages; onFini: (r: Reglages) => void }) {
  const [etape, setEtape] = useState(() => Number(new URLSearchParams(location.search).get('etape')) || 0)
  const [objectifs, setObjectifs] = useState<Objectif[]>(reglages.objectifs.length ? reglages.objectifs : ['formation'])
  const [dossier, setDossier] = useState<string | null>(reglages.dossier)

  const suivant = async () => {
    if (etape === 1) await window.cliplex.reglages.ecrire({ objectifs })
    if (etape === 2) await window.cliplex.reglages.ecrire({ dossier })
    if (etape === DERNIERE) return onFini(await window.cliplex.reglages.ecrire({ accueilFini: true }))
    setEtape(etape + 1)
  }

  return (
    <div className="flex h-full">
      <aside className="glisser flex w-[400px] flex-none flex-col bg-nuit text-white">
        <div className="px-10 pt-14">
          <Logo sombre taille={26} />
          <h1 className="mt-16 text-[28px] font-bold leading-tight tracking-[-0.02em]">
            Tu tournes.
            <br />
            <span className="text-violet-clair">Cliplex monte.</span>
          </h1>
          <p className="mt-3.5 text-[14px] leading-relaxed text-[#A8A3B5]">Six étapes et ton Mac est prêt. Tout ce qui est installé est montré et expliqué, et reste dans un seul dossier.</p>
        </div>
        <ol className="mx-10 mt-11 flex flex-col gap-1">
          {ETAPES.map((e, i) => (
            <li key={e.titre} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium ${i === etape ? 'bg-nuit-3 text-white' : 'text-[#8C879A]'}`}>
              <span className={`grid h-6 w-6 place-items-center rounded-full border text-[11px] font-semibold ${i < etape ? 'border-vert bg-vert text-white' : i === etape ? 'border-violet bg-violet' : 'border-white/10'}`}>
                {i < etape ? <Icone nom="coche" taille={12} /> : i + 1}
              </span>
              {e.titre}
              <small className="ml-auto text-[11.5px] font-normal text-[#6E6880]">{e.duree}</small>
            </li>
          ))}
        </ol>
        <div className="mt-auto flex justify-between border-t border-white/10 px-10 py-5 text-[12px] text-[#8C879A]">
          <span>Gratuit et open source</span>
          <span>v0.1</span>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="glisser h-10 flex-none" />
        <div className="flex min-h-0 flex-1 flex-col px-[72px] pb-9 pt-8">
          <div className="-mx-[72px] flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-[72px] pb-6">
            <div className="surtitre">
              Étape {etape + 1} sur {ETAPES.length}
            </div>
            {etape === 0 && <EtapeBesoins />}
            {etape === 1 && <EtapeObjectifs choisis={objectifs} onChange={setObjectifs} />}
            {etape === 2 && <EtapeDossier dossier={dossier} onChange={setDossier} />}
            {etape === 3 && <EtapeInstallation />}
            {etape === 4 && <EtapeClaude />}
            {etape === 5 && <EtapeInspirations />}
          </div>
          <div className="flex flex-none items-center justify-between border-t border-bord pt-6">
            {etape > 0 ? (
              <button className="btn-fantome" onClick={() => setEtape(etape - 1)}>
                <Icone nom="retour" />
                Retour
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              {etape === DERNIERE && (
                <button className="btn-fantome" onClick={suivant}>
                  Plus tard
                </button>
              )}
              <button className="btn-noir" onClick={suivant} disabled={etape === 1 && objectifs.length === 0}>
                {etape === DERNIERE ? 'Ouvrir Cliplex' : 'Continuer'}
                <Icone nom="fleche" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function EtapeBesoins() {
  const [claude, setClaude] = useState<EtatClaude | null>(null)
  const [chrome, setChrome] = useState<EtatChrome | null>(null)
  useEffect(() => {
    window.cliplex.claude.etat().then(setClaude)
    window.cliplex.claude.chrome().then(setChrome)
  }, [])
  return (
    <>
      <Titre titre="Ce qu'il te faut" texte="Cliplex est gratuit. Le montage est fait par un agent IA que tu as déjà, avec ton propre abonnement : Cliplex ne voit jamais tes identifiants." />
      <div className="mt-7 max-w-[760px]">
        <span className="libelle">Un agent IA</span>
        <div className="flex flex-col gap-2">
          <Besoin
            icone="agent"
            titre="Claude Code"
            texte="Disponible. Il faut un compte Claude avec un abonnement qui inclut Claude Code (Pro ou Max). S'il n'est pas sur ton Mac, Cliplex l'installe dans son dossier."
            etat={!claude ? <Pastille ton="g">Vérification…</Pastille> : claude.connecte ? <Pastille ton="ok">Connecté</Pastille> : claude.installe ? <Pastille ton="v">Trouvé sur ton Mac</Pastille> : <Pastille ton="g">Installé à l'étape 4</Pastille>}
          />
          <Besoin icone="agent" titre="Codex (ChatGPT) et d'autres agents" texte="Arrivent dans une prochaine version. Tu pourras choisir celui que tu préfères." etat={<Pastille ton="g">Bientôt</Pastille>} grise />
        </div>
        <span className="libelle mt-6">Ton Mac</span>
        <div className="flex flex-col gap-2">
          <Besoin icone="disque" titre="Une puce Apple (M1 ou plus récente) et environ 2 Go libres" texte="Pour les outils de montage (ffmpeg, transcription, moteur d'animation), tous rangés dans ton dossier Cliplex." />
          <Besoin
            icone="globe"
            titre="Chrome avec l'extension Claude (facultatif)"
            texte="Seulement pour donner des liens YouTube en inspiration : Claude ouvre la vidéo dans Chrome et la regarde. Sans elle, tu peux déposer des vidéos ou des images."
            etat={chrome?.extension ? <Pastille ton="ok">Extension trouvée</Pastille> : <Pastille ton="g">Facultatif</Pastille>}
          />
        </div>
      </div>
    </>
  )
}

function Besoin({ icone, titre, texte, etat, grise }: { icone: NomIcone; titre: string; texte: string; etat?: React.ReactNode; grise?: boolean }) {
  return (
    <div className={`carte grid grid-cols-[40px_1fr_auto] items-center gap-3.5 p-4 ${grise ? 'opacity-60' : ''}`}>
      <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-violet-fond text-violet">
        <Icone nom={icone} taille={19} />
      </span>
      <span>
        <b className="block text-[14px] font-semibold">{titre}</b>
        <span className="mt-0.5 block text-[12.5px] leading-normal text-muet">{texte}</span>
      </span>
      {etat}
    </div>
  )
}

function EtapeInspirations() {
  return (
    <div>
      <Titre titre="Montre à Claude ce que tu aimes" texte="Dépose deux à cinq vidéos dont le montage te plaît (les tiennes ou celles des autres), ou colle des liens YouTube. Claude les regarde, en tire ton style, puis te pose ses questions. Tu peux aussi le faire plus tard." />
      <ZoneInspirations compact />
    </div>
  )
}

function Titre({ titre, texte }: { titre: string; texte: string }) {
  return (
    <div className="max-w-[680px]">
      <h2 className="mt-2 text-[24px] font-bold tracking-[-0.02em]">{titre}</h2>
      <p className="mt-1.5 text-[14px] leading-normal text-muet">{texte}</p>
    </div>
  )
}

function EtapeObjectifs({ choisis, onChange }: { choisis: Objectif[]; onChange: (o: Objectif[]) => void }) {
  const basculer = (id: Objectif) => onChange(choisis.includes(id) ? choisis.filter((c) => c !== id) : [...choisis, id])
  return (
    <>
      <Titre titre="Qu'est-ce que tu veux faire ?" texte="Coche tout ce qui t'intéresse. Cliplex adapte ses menus, tu pourras changer plus tard." />
      <div className="mt-7 grid grid-cols-2 gap-3">
        {OBJECTIFS.map((o) => {
          const on = choisis.includes(o.id)
          return (
            <button
              key={o.id}
              onClick={() => basculer(o.id)}
              className={`carte grid grid-cols-[40px_1fr_18px] items-start gap-3.5 p-4 text-left transition-shadow ${on ? 'border-violet shadow-[0_0_0_3px_#F2EAFC]' : 'hover:border-[#D4D4D8]'}`}
            >
              <span className={`grid h-10 w-10 place-items-center rounded-[10px] ${on ? 'bg-violet-fond text-violet' : 'bg-fond text-encre-2'}`}>
                <Icone nom={o.icone} taille={20} />
              </span>
              <span>
                <span className="block text-[14px] font-semibold">{o.titre}</span>
                <span className="mt-0.5 block text-[12.5px] leading-normal text-muet">{o.texte}</span>
              </span>
              <span className={`mt-0.5 grid h-[18px] w-[18px] place-items-center rounded-[5px] border-[1.5px] ${on ? 'border-violet bg-violet text-white' : 'border-[#D4D4D8]'}`}>
                {on && <Icone nom="coche" taille={11} />}
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}

function EtapeDossier({ dossier, onChange }: { dossier: string | null; onChange: (d: string | null) => void }) {
  const choisir = async () => {
    const d = await window.cliplex.reglages.choisirDossier()
    if (d) onChange(d)
  }
  return (
    <>
      <Titre titre="Un seul dossier pour tout" texte="Les outils, tes vidéos, tes inspirations et ton style iront dans ce dossier, et nulle part ailleurs. Tout reste sur ton Mac." />
      <div className="carte mt-7 flex items-center gap-4 p-4">
        <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-violet-fond text-violet">
          <Icone nom="dossier" taille={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold">{dossier ?? '~/Cliplex'}</div>
          <div className="text-[12.5px] text-muet">{dossier ? 'Dossier choisi' : 'Par défaut, dans ton dossier personnel'}</div>
        </div>
        <button className="btn-blanc" onClick={choisir}>
          Choisir un autre dossier
        </button>
      </div>
      <div className="carte mt-3 p-4 font-mono text-[12px] leading-[1.8] text-encre-2">
        <div>{dossier ?? '~/Cliplex'}/</div>
        <div className="pl-4">outils/<span className="text-doux">   ffmpeg, transcription, moteur d'animation, Claude Code si besoin</span></div>
        <div className="pl-4">projets/<span className="text-doux">   une vidéo = un dossier (rushs, montage)</span></div>
        <div className="pl-4">inspirations/<span className="text-doux">   les vidéos que tu aimes et ce que Claude en a tiré</span></div>
        <div className="pl-4">style/<span className="text-doux">   ton style de montage</span></div>
        <div className="pl-4">bibliotheque/<span className="text-doux">   tes polices, sons et musiques</span></div>
      </div>
      <p className="mt-3 text-[12.5px] leading-normal text-muet">Ce sont des fichiers normaux : tu peux les ouvrir, les copier ou les sauvegarder comme tu veux. Si tu choisis un dossier comme le Bureau, Cliplex crée dedans un sous-dossier « Cliplex » pour ne rien éparpiller.</p>
      <p className="mt-1.5 text-[12.5px] leading-normal text-muet">Pour tout désinstaller : supprime l'app et ce dossier. Rien d'autre n'est installé sur ton Mac.</p>
    </>
  )
}

function EtapeInstallation() {
  const [outils, setOutils] = useState<Outil[]>([])
  const [journal, setJournal] = useState<LigneJournal[]>([])
  const [tout, setTout] = useState(false)
  const bas = useRef<HTMLDivElement>(null)

  const rafraichir = () => window.cliplex.outils.lister().then(setOutils)

  useEffect(() => {
    rafraichir()
    const t = setInterval(rafraichir, 4000)
    const stop = window.cliplex.outils.journal((l) => setJournal((j) => [...j.slice(-400), l]))
    return () => {
      clearInterval(t)
      stop()
    }
  }, [])

  useEffect(() => bas.current?.scrollIntoView({ block: 'end' }), [journal])

  const installer = async (id: string) => {
    setOutils((o) => o.map((x) => (x.id === id ? { ...x, etat: 'installation' } : x)))
    const ok = await window.cliplex.outils.installer(id)
    await rafraichir()
    return ok
  }

  const toutInstaller = async () => {
    setTout(true)
    for (const o of await window.cliplex.outils.lister()) {
      if (o.etat === 'present') continue
      // Un outil qui échoue arrête la suite : les suivants peuvent en dépendre.
      if (!(await installer(o.id))) break
    }
    setTout(false)
  }

  const prets = outils.filter((o) => o.etat === 'present').length
  const pct = outils.length ? Math.round((prets / outils.length) * 100) : 0

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-end justify-between gap-6">
        <Titre titre="On prépare ton Mac" texte="Des outils libres et reconnus, installés dans ton dossier Cliplex, sans mot de passe. Pour chacun : ce qu'il fait dans ton montage, et la commande exacte lancée." />
        <button className="btn-violet flex-none" onClick={toutInstaller} disabled={tout || prets === outils.length}>
          {prets === outils.length && outils.length ? 'Tout est prêt' : tout ? 'Installation…' : 'Tout installer'}
        </button>
      </div>
      <div className="mt-6 grid min-h-0 flex-1 grid-cols-[1fr_260px] gap-6">
        <div className="flex min-h-0 flex-col gap-2 overflow-y-auto pr-1">
          {outils.map((o) => (
            <LigneOutil key={o.id} outil={o} onInstaller={() => installer(o.id)} occupe={tout} />
          ))}
        </div>
        <div className="carte self-start p-4">
          <div className="text-[13px] font-semibold">Progression</div>
          <div className="relative mx-auto my-4 h-[108px] w-[108px]">
            <svg width="108" height="108" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" stroke="#F2EAFC" strokeWidth="10" fill="none" />
              <circle cx="60" cy="60" r="50" stroke="#8E44E0" strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray="314" strokeDashoffset={314 - (314 * pct) / 100} transform="rotate(-90 60 60)" />
            </svg>
            <b className="absolute inset-0 grid place-items-center text-[22px] font-bold">{pct} %</b>
          </div>
          <dl className="grid grid-cols-[1fr_auto] gap-2 text-[12.5px]">
            <dt className="text-muet">Outils prêts</dt>
            <dd className="text-right font-semibold">
              {prets} sur {outils.length}
            </dd>
          </dl>
          <p className="mt-3.5 border-t border-bord-2 pt-3.5 text-[12px] leading-normal text-muet">Tu es développeur ? Toutes les commandes sont dans la documentation : tu peux tout installer toi-même.</p>
        </div>
      </div>
      <div className="mt-5 h-[190px] flex-none overflow-hidden rounded-xl bg-nuit font-mono text-[11.5px] leading-[1.75] text-[#CFCADA]">
        <div className="flex h-10 items-center gap-2.5 border-b border-white/10 px-4 font-sans text-[12.5px] font-semibold text-white">
          <Icone nom="terminal" />
          Journal en direct
          <span className="font-medium text-[#8C879A]">· commandes réelles</span>
          <button className="ml-auto font-medium text-[#8C879A] hover:text-white" onClick={() => navigator.clipboard.writeText(journal.map((l) => l.texte).join('\n'))}>
            Copier
          </button>
        </div>
        <div className="h-[150px] overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words px-4 py-2.5 select-text">
          {journal.length === 0 && <div className="text-[#6E6880]"># Les commandes lancées s'afficheront ici, ligne par ligne.</div>}
          {journal.map((l, i) => (
            <div key={i} className={{ commande: '', sortie: '', succes: 'text-[#5FD39A]', erreur: 'text-[#F2A7A0]', note: 'text-[#6E6880]' }[l.type]}>
              {l.type === 'commande' && <span className="text-violet-clair">$ </span>}
              {l.texte}
            </div>
          ))}
          <div ref={bas} />
        </div>
      </div>
    </div>
  )
}

function LigneOutil({ outil: o, onInstaller, occupe }: { outil: Outil; onInstaller: () => void; occupe: boolean }) {
  const cours = o.etat === 'installation'
  return (
    <div className={`carte grid grid-cols-[26px_1fr_auto] items-center gap-3.5 px-4 py-3.5 ${cours ? 'border-violet-clair shadow-[0_0_0_3px_#F2EAFC]' : ''}`}>
      {o.etat === 'present' ? (
        <span className="grid h-6 w-6 place-items-center rounded-full bg-vert-fond text-vert">
          <Icone nom="coche" taille={12} />
        </span>
      ) : cours ? (
        <span className="tourne h-6 w-6 rounded-full border-[2.5px] border-violet-fond border-t-violet" />
      ) : (
        <span className={`h-6 w-6 rounded-full border-[1.5px] ${o.etat === 'erreur' ? 'border-red-400' : 'border-[#D4D4D8]'}`} />
      )}
      <div className="min-w-0">
        <div className="flex items-baseline gap-2 text-[14px] font-semibold">
          {o.nom}
          {o.version && <span className="text-[11.5px] font-medium text-doux">{o.version}</span>}
          {!o.version && <span className="text-[11.5px] font-medium text-doux">{o.taille}</span>}
        </div>
        <p className="mt-0.5 text-[12.5px] leading-normal text-muet">{o.role}</p>
        {o.etat !== 'present' && <code className="mt-1.5 block truncate font-mono text-[11.5px] text-encre-2 select-text">$ {o.commande}</code>}
      </div>
      {o.etat === 'present' ? (
        <Pastille ton="ok">Prêt</Pastille>
      ) : cours ? (
        <Pastille ton="v">En cours</Pastille>
      ) : (
        <button className="btn-blanc h-8 px-3 text-[12.5px]" onClick={onInstaller} disabled={occupe}>
          {o.etat === 'erreur' ? 'Réessayer' : 'Installer'}
        </button>
      )}
    </div>
  )
}

export function Pastille({ ton, children }: { ton: 'ok' | 'v' | 'g'; children: React.ReactNode }) {
  const styles = { ok: 'bg-vert-fond text-[#166534] [&>i]:bg-vert', v: 'bg-violet-fond text-violet-fonce [&>i]:bg-violet', g: 'bg-[#F1F1F3] text-muet [&>i]:bg-doux' }
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11.5px] font-medium ${styles[ton]}`}>
      <i className="h-1.5 w-1.5 rounded-full" />
      {children}
    </span>
  )
}

function EtapeClaude() {
  const [etat, setEtat] = useState<EtatClaude | null>(null)
  const [chrome, setChrome] = useState<EtatChrome | null>(null)
  useEffect(() => {
    const lire = () => {
      window.cliplex.claude.etat().then(setEtat)
      window.cliplex.claude.chrome().then(setChrome)
    }
    lire()
    const t = setInterval(lire, 3000)
    return () => clearInterval(t)
  }, [])

  return (
    <>
      <Titre titre="Connecte ton compte Claude" texte="Cliplex utilise Claude Code avec ton propre abonnement. Cliplex ne voit jamais ton mot de passe : la connexion se fait dans ton navigateur." />
      <div className="carte mt-7 flex items-center gap-4 p-5">
        <span className="grid h-11 w-11 place-items-center rounded-[10px] bg-violet-fond text-violet">
          <Icone nom="terminal" taille={20} />
        </span>
        <div className="flex-1">
          <div className="text-[14px] font-semibold">Claude Code</div>
          <div className="text-[12.5px] text-muet">
            {!etat ? 'Vérification…' : !etat.installe ? "Pas encore installé : reviens à l'étape précédente." : etat.connecte ? `Connecté${etat.detail ? ` avec ${etat.detail}` : ''}` : 'Installé, pas encore connecté.'}
          </div>
        </div>
        {etat?.connecte ? (
          <Pastille ton="ok">Connecté</Pastille>
        ) : (
          <button className="btn-violet" onClick={() => window.cliplex.claude.connecter()} disabled={!etat?.installe}>
            Me connecter
          </button>
        )}
      </div>
      <div className="mt-3 rounded-xl border border-dashed border-bord p-4 text-[12.5px] leading-relaxed text-muet">
        « Me connecter » ouvre le Terminal avec la commande <code className="font-mono text-encre-2">claude auth login</code>. Ton navigateur s'ouvre, tu te connectes à ton compte Claude, et Cliplex le détecte tout seul.
      </div>
      <div className="carte mt-6 flex items-center gap-4 p-5">
        <span className="grid h-11 w-11 place-items-center rounded-[10px] bg-fond text-encre-2">
          <Icone nom="globe" taille={20} />
        </span>
        <div className="flex-1">
          <div className="text-[14px] font-semibold">Claude dans Chrome (facultatif)</div>
          <div className="text-[12.5px] leading-normal text-muet">
            {!chrome ? 'Vérification…' : !chrome.chrome ? 'Chrome n’est pas installé. Tu pourras quand même déposer des vidéos et des images.' : chrome.extension ? 'Extension Claude trouvée : Claude pourra regarder tes liens YouTube.' : 'Pour que Claude regarde tes liens YouTube, installe l’extension Claude dans Chrome et connecte-la à ton compte.'}
          </div>
        </div>
        {chrome?.extension ? (
          <Pastille ton="ok">Prête</Pastille>
        ) : (
          <button className="btn-blanc" disabled={!chrome?.chrome} onClick={() => window.cliplex.claude.installerExtension()}>
            Installer l'extension
          </button>
        )}
      </div>
    </>
  )
}
