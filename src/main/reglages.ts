import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { basename, join } from 'path'
import type { Reglages } from '../shared/types'

const DEJA_CLIPLEX = ['outils', 'projets', 'inspirations', 'style']
const DEFAUT: Reglages = { accueilFini: false, objectifs: [], dossier: null }

function fichier(): string {
  return join(app.getPath('userData'), 'reglages.json')
}

export function lireReglages(): Reglages {
  try {
    const r: Reglages = { ...DEFAUT, ...JSON.parse(readFileSync(fichier(), 'utf8')) }
    return { ...r, dossier: r.dossier ? avecSousDossier(r.dossier) : null }
  } catch {
    return { ...DEFAUT }
  }
}

export function ecrireReglages(partiel: Partial<Reglages>): Reglages {
  const r = { ...lireReglages(), ...partiel }
  mkdirSync(app.getPath('userData'), { recursive: true })
  writeFileSync(fichier(), JSON.stringify(r, null, 2))
  return r
}

/**
 * Cliplex range tout dans un sous-dossier « Cliplex » du dossier choisi,
 * pour ne jamais éparpiller ses fichiers sur le Bureau ou dans Documents.
 * Le dépôt cloné (il s'appelle aussi « cliplex ») garde ses fichiers dans espace/, comme ./cliplex :
 * les outils déjà installés sans l'app sont retrouvés au lieu d'être réinstallés.
 * Un dossier qui est déjà un dossier Cliplex (outils, projets, inspirations ou style) est gardé tel quel.
 */
export function avecSousDossier(choisi: string): string {
  if (existsSync(join(choisi, 'cliplex')) && existsSync(join(choisi, 'moteur', 'outils'))) return join(choisi, 'espace')
  if (DEJA_CLIPLEX.some((s) => existsSync(join(choisi, s)))) return choisi
  return basename(choisi).toLowerCase() === 'cliplex' ? choisi : join(choisi, 'Cliplex')
}

/** Dossier Cliplex (outils, projets, inspirations, style), ~/Cliplex par défaut. Créé au besoin. */
export function dossierTravail(): string {
  const r = lireReglages().dossier
  const d = r ? avecSousDossier(r) : join(homedir(), 'Cliplex')
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
  return d
}

/**
 * Tout ce que Cliplex installe (ffmpeg, Node, Python, modèles, moteur d'animation,
 * Claude Code s'il manquait) reste dans <dossier>/outils : supprimer le dossier
 * Cliplex efface tout, rien n'est installé ailleurs sur le Mac.
 */
export function dossierOutils(): string {
  return sousDossier('outils')
}

/** Un sous-dossier du dossier Cliplex (projets, inspirations, style, bibliotheque…), créé au besoin. */
export function sousDossier(nom: string): string {
  const d = join(dossierTravail(), nom)
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
  return d
}
