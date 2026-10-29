import { existsSync, readFileSync, statSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import type { LigneJournal, Outil } from '../shared/types'
import { chemins, lancer, suivre } from './environnement'
import { dossierOutils } from './reglages'
import { dossierMoteur, dossierStudio } from './moteur'

export const MODELE_WHISPER = 'ggml-large-v3-turbo-q5_0.bin'

// Versions figées : la même installation pour tout le monde, mise à jour avec l'app.
const NODE = '24.22.1'
const UV = '0.13.6'
const PUCE = process.arch === 'arm64' ? { node: 'arm64', uv: 'aarch64', ffmpeg: 'arm64' } : { node: 'x64', uv: 'x86_64', ffmpeg: 'amd64' }

interface Definition extends Omit<Outil, 'etat' | 'version' | 'chemin' | 'commande'> {
  commande: () => string
  detecter: () => Promise<{ version?: string; chemin?: string } | null>
}

const premiere = (texte: string, motif: RegExp): string | undefined => texte.match(motif)?.[1]
/** Précise quand l'outil trouvé n'est pas celui de Cliplex : rien n'est réinstallé. */
const surLeMac = (local: string) => (existsSync(local) ? '' : ', déjà sur ton Mac')
const modeles = () => join(chemins().outils, 'modeles')
const cheminModele = () => join(modeles(), MODELE_WHISPER)

// Tout s'installe dans <dossier>/outils, sans mot de passe ni Homebrew.
// L'ordre compte : Node sert au moteur d'animation et à installer Claude Code.
const DEFINITIONS: Definition[] = [
  {
    id: 'ffmpeg',
    nom: 'ffmpeg',
    role: "Découpe, assemble et exporte la vidéo. C'est la base de presque tous les logiciels de montage.",
    taille: '≈ 80 Mo',
    commande: () => {
      const b = chemins().bin
      return `mkdir -p "${b}" && cd "${b}" && for x in ffmpeg ffprobe; do curl -L --fail --progress-bar -o $x.zip https://ffmpeg.martin-riedl.de/redirect/latest/macos/${PUCE.ffmpeg}/release/$x.zip && unzip -oq $x.zip && rm $x.zip; done`
    },
    detecter: async () => {
      // Celui de Cliplex, sinon celui du Mac s'il a le débruiteur de voix (filtre arnndn), ffprobe
      // et l'option -fps_mode des scripts (ffmpeg 5.1 et plus : -vsync n'existe plus depuis ffmpeg 9).
      const r = await lancer('ffmpeg', ['-hide_banner', '-filters'])
      const v = await lancer('ffmpeg', ['-version'])
      if (!r.ok || !r.sortie.includes('arnndn') || !(await lancer('ffprobe', ['-version'])).ok) return null
      if (!(await lancer('ffmpeg', ['-hide_banner', '-h', 'long'])).sortie.includes('fps_mode')) return null
      return { version: `${premiere(v.sortie, /ffmpeg version (\S+)/) ?? ''}${surLeMac(join(chemins().bin, 'ffmpeg'))}` }
    }
  },
  {
    id: 'node',
    nom: 'Node.js',
    role: "Fait tourner le moteur d'animation qui dessine les textes, les sous-titres et les effets.",
    taille: '≈ 50 Mo',
    commande: () => {
      const d = join(chemins().outils, 'node')
      return `mkdir -p "${d}" && curl -L --fail --progress-bar https://nodejs.org/dist/v${NODE}/node-v${NODE}-darwin-${PUCE.node}.tar.gz | tar xz -C "${d}" --strip-components 1`
    },
    detecter: async () => {
      // Celui de Cliplex, sinon celui du Mac à partir de Node 18 (avec npm).
      const r = await lancer('node', ['--version'])
      if (!r.ok || parseInt(r.sortie.replace(/^v/, '')) < 18 || !(await lancer('npm', ['--version'])).ok) return null
      return { version: `${r.sortie.replace(/^v/, '')}${surLeMac(join(chemins().node, 'node'))}` }
    }
  },
  {
    id: 'python',
    nom: 'Python et whisper',
    role: 'Repère les moments où tu parles et écrit les sous-titres mot à mot, directement sur ton Mac. Rien n’est envoyé en ligne.',
    taille: '≈ 120 Mo',
    commande: () => {
      const c = chemins()
      const d = join(c.outils, 'python')
      return `mkdir -p "${c.bin}" && curl -L --fail -sS https://github.com/astral-sh/uv/releases/download/${UV}/uv-${PUCE.uv}-apple-darwin.tar.gz | tar xz -C "${c.bin}" --strip-components 1 && "${c.bin}/uv" venv --python 3.12 "${d}" && "${c.bin}/uv" pip install --python "${d}/bin/python" numpy pywhispercpp`
    },
    detecter: async () => {
      // Le moteur prend celui de Cliplex, sinon python3 s'il a déjà numpy et pywhispercpp.
      const test = ['-c', 'import numpy, pywhispercpp, sys; print(sys.version.split()[0])']
      const local = await lancer(chemins().python, test)
      if (local.ok) return { version: `Python ${local.sortie}`, chemin: chemins().python }
      const mac = await lancer('python3', test)
      return mac.ok ? { version: `Python ${mac.sortie}, déjà sur ton Mac` } : null
    }
  },
  {
    id: 'modele',
    nom: 'Modèle de transcription',
    role: 'Le « cerveau » de whisper, entraîné à reconnaître la parole en français et dans 90 autres langues.',
    taille: '≈ 575 Mo',
    commande: () => {
      const f = cheminModele()
      return `mkdir -p "${modeles()}" && curl -L --fail --progress-bar -o "${f}.part" https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${MODELE_WHISPER} && mv "${f}.part" "${f}"`
    },
    detecter: async () => {
      const f = cheminModele()
      return existsSync(f) && statSync(f).size > 400e6 ? { version: 'large-v3-turbo', chemin: f } : null
    }
  },
  {
    id: 'debruiteur',
    nom: 'Débruiteur de voix',
    role: 'Un petit réseau de neurones (RNNoise) qui retire le souffle et les bruits de fond de ta voix, sans la déformer.',
    taille: '≈ 300 Ko',
    commande: () => `mkdir -p "${modeles()}" && curl -L --fail -sS -o "${modeles()}/sh.rnnn" https://raw.githubusercontent.com/GregorR/rnnoise-models/master/somnolent-hogwash-2018-09-01/sh.rnnn`,
    detecter: async () => {
      const f = join(modeles(), 'sh.rnnn')
      return existsSync(f) && statSync(f).size > 200e3 ? { version: 'somnolent-hogwash', chemin: f } : null
    }
  },
  {
    id: 'studio',
    nom: "Moteur d'animation (Remotion)",
    role: 'Dessine chaque image de ta vidéo : plans, zooms, sous-titres, titres, schémas. Il télécharge aussi le navigateur qui sert au rendu.',
    taille: '≈ 300 Mo',
    commande: () => {
      const src = join(dossierMoteur(), 'studio')
      const d = dossierStudio()
      return `mkdir -p "${d}" && cp -R "${src}/src" "${src}/package.json" "${src}/remotion.config.ts" "${src}/tsconfig.json" "${d}/" && cd "${d}" && npm install --no-audit --no-fund && npx remotion browser ensure && CLIPLEX_STUDIO="${d}" CLIPLEX_OUTILS="${dossierOutils()}" "${join(dossierMoteur(), 'outils', 'tester-rendu.sh')}"`
    },
    detecter: async () => {
      const d = dossierStudio()
      const installe = join(d, 'node_modules', 'remotion', 'package.json')
      if (!existsSync(installe)) return null
      // Une nouvelle version du moteur livrée avec l'app demande une réinstallation.
      const livre = readFileSync(join(dossierMoteur(), 'studio', 'package.json'), 'utf8')
      if (readFileSync(join(d, 'package.json'), 'utf8') !== livre) return null
      return { version: JSON.parse(readFileSync(installe, 'utf8')).version, chemin: d }
    }
  },
  {
    id: 'claude',
    nom: 'Claude Code',
    role: "L'agent qui regarde tes inspirations et monte tes vidéos, avec ton propre abonnement Claude. S'il est déjà sur ton Mac, Cliplex se sert du tien.",
    taille: '≈ 60 Mo',
    commande: () => {
      const d = join(chemins().outils, 'claude')
      return `mkdir -p "${d}" && npm install --prefix "${d}" --no-audit --no-fund @anthropic-ai/claude-code && touch "${d}/.cliplex"`
    },
    detecter: async () => {
      const r = await lancer('claude', ['--version'])
      if (!r.ok) return null
      const local = existsSync(chemins().claudeLocal)
      return { version: `${premiere(r.sortie, /^(\S+)/)}${local ? '' : ', déjà sur ton Mac'}` }
    }
  }
]

/** Les commandes s'affichent avec ~ à la place du dossier personnel : plus court, et rien de personnel à l'écran. */
const lisible = (commande: string) => commande.split(homedir()).join('~')

const enCours = new Set<string>()
const erreurs = new Set<string>()

export async function listerOutils(): Promise<Outil[]> {
  return Promise.all(
    DEFINITIONS.map(async ({ detecter, commande, ...d }) => {
      const base = { ...d, commande: lisible(commande()) }
      if (enCours.has(d.id)) return { ...base, etat: 'installation' as const }
      const trouve = await detecter()
      if (trouve) return { ...base, etat: 'present' as const, ...trouve }
      return { ...base, etat: erreurs.has(d.id) ? ('erreur' as const) : ('absent' as const) }
    })
  )
}

export async function installerOutil(id: string, journal: (l: LigneJournal) => void): Promise<boolean> {
  const def = DEFINITIONS.find((d) => d.id === id)
  if (!def || enCours.has(id)) return false
  const commande = def.commande()
  enCours.add(id)
  erreurs.delete(id)
  journal({ outil: id, type: 'note', texte: `# ${def.nom} : ${def.role}` })
  journal({ outil: id, type: 'commande', texte: lisible(commande) })
  let dernier = -1
  const ok = await suivre(commande, (texte, erreur) => {
    // Barre de progression de curl : une ligne tous les 5 %, pas des centaines.
    const pct = texte.match(/(\d+(?:\.\d+)?)%/)
    if (pct && /^[\s#]+/.test(texte)) {
      const p = Math.floor(parseFloat(pct[1]) / 5) * 5
      if (p === dernier) return
      dernier = p
      journal({ outil: id, type: 'sortie', texte: `téléchargement : ${p} %` })
      return
    }
    journal({ outil: id, type: erreur ? 'erreur' : 'sortie', texte: lisible(texte) })
  })
  enCours.delete(id)
  const present = ok && (await def.detecter())
  if (present) {
    journal({ outil: id, type: 'succes', texte: `${def.nom} est prêt${present.version ? ` (${present.version})` : ''}.` })
    return true
  }
  erreurs.add(id)
  journal({ outil: id, type: 'erreur', texte: `${def.nom} n'a pas pu être installé. La commande ci-dessus peut être lancée à la main dans le Terminal.` })
  return false
}
