import { shell } from 'electron'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { ReglagesPrompteur, Script } from '../shared/types'
import { sousDossier } from './reglages'

// Un script = un dossier lisible à la main, comme dans ./cliplex :
//   <dossier>/scripts/<id>/script.json   titre et dates
//   <dossier>/scripts/<id>/script.md     le texte lu au prompteur
//   <dossier>/scripts/prompteur.json     vitesse, taille et miroir, communs à tous les scripts

export const REGLAGES_DEFAUT: ReglagesPrompteur = { vitesse: 3, taille: 48, miroir: false }

function racine(): string {
  return sousDossier('scripts')
}

export function dossierScript(id: string): string {
  return join(racine(), id)
}

function slug(titre: string): string {
  const base =
    titre
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'script'
  let id = base
  for (let n = 2; existsSync(dossierScript(id)); n++) id = `${base}-${n}`
  return id
}

export function lireScript(id: string): Script | null {
  try {
    const s = JSON.parse(readFileSync(join(dossierScript(id), 'script.json'), 'utf8')) as Script
    const md = join(dossierScript(id), 'script.md')
    return { ...s, texte: existsSync(md) ? readFileSync(md, 'utf8') : '' }
  } catch {
    return null
  }
}

function ecrire(s: Script): Script {
  const { texte, ...stocke } = s
  writeFileSync(join(dossierScript(s.id), 'script.json'), JSON.stringify(stocke, null, 2))
  writeFileSync(join(dossierScript(s.id), 'script.md'), texte)
  return s
}

export function listerScripts(): Script[] {
  return readdirSync(racine())
    .map(lireScript)
    .filter((s): s is Script => s !== null)
    .sort((a, b) => b.majLe.localeCompare(a.majLe))
}

export function creerScript(titre: string): Script {
  const id = slug(titre)
  mkdirSync(dossierScript(id), { recursive: true })
  const maintenant = new Date().toISOString()
  return ecrire({ id, titre: titre.trim() || 'Nouveau script', texte: '', creeLe: maintenant, majLe: maintenant })
}

export function modifierScript(id: string, partiel: Partial<Pick<Script, 'titre' | 'texte'>>): Script {
  const s = lireScript(id)
  if (!s) throw new Error(`Script introuvable : ${id}`)
  return ecrire({ ...s, ...partiel, id, majLe: new Date().toISOString() })
}

export async function supprimerScript(id: string): Promise<void> {
  if (lireScript(id)) await shell.trashItem(dossierScript(id))
}

export function lireReglagesPrompteur(): ReglagesPrompteur {
  try {
    return { ...REGLAGES_DEFAUT, ...JSON.parse(readFileSync(join(racine(), 'prompteur.json'), 'utf8')) }
  } catch {
    return { ...REGLAGES_DEFAUT }
  }
}

export function ecrireReglagesPrompteur(partiel: Partial<ReglagesPrompteur>): ReglagesPrompteur {
  const r = { ...lireReglagesPrompteur(), ...partiel, majLe: new Date().toISOString() }
  r.vitesse = Math.min(10, Math.max(0.5, Number(r.vitesse) || REGLAGES_DEFAUT.vitesse))
  r.taille = Math.min(160, Math.max(24, Math.round(Number(r.taille) || REGLAGES_DEFAUT.taille)))
  r.miroir = !!r.miroir
  writeFileSync(join(racine(), 'prompteur.json'), JSON.stringify(r, null, 2))
  return r
}
