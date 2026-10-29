import { BrowserWindow } from 'electron'
import { randomBytes } from 'crypto'
import { readFileSync, statSync } from 'fs'
import { createServer, type Server } from 'http'
import { networkInterfaces } from 'os'
import { join } from 'path'
import type { Prompteur, ReglagesPrompteur } from '../shared/types'
import { dossierMoteur } from './moteur'
import { dossierScript, ecrireReglagesPrompteur, lireReglagesPrompteur, lireScript } from './scripts'

// Le prompteur est une page web servie sur le réseau local, que le téléphone ouvre avec le QR code.
// ./cliplex prompteur sert la même page (moteur/prompteur/servir.py) aux mêmes adresses :
//   /p/<jeton>/           la page
//   /p/<jeton>/etat       { titre, texte, version, reglages }
//   /p/<jeton>/reglages   POST { vitesse, taille, miroir }
// Le jeton, tiré au hasard à chaque lancement, empêche les autres appareils du réseau de lire le script.

const PORT = 4848

let serveur: Server | null = null
let port = 0
let jeton = ''
let actif: string | null = null
let fenetre: BrowserWindow | null = null

function repondre(res: import('http').ServerResponse, code: number, type: string, corps: string): void {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' })
  res.end(corps)
}

function demarrer(): Promise<void> {
  if (serveur) return Promise.resolve()
  jeton = randomBytes(9).toString('base64url')
  const s = createServer((req, res) => {
    const chemin = (req.url ?? '/').split('?')[0]
    const base = `/p/${jeton}`
    if (chemin === base) return res.writeHead(302, { Location: `${base}/` }).end()
    if (!chemin.startsWith(`${base}/`)) return repondre(res, 404, 'text/plain; charset=utf-8', 'Introuvable')
    const route = chemin.slice(base.length + 1)
    if (route === '' && req.method === 'GET') return repondre(res, 200, 'text/html; charset=utf-8', readFileSync(join(dossierMoteur(), 'prompteur', 'prompteur.html'), 'utf8'))
    if (route === 'etat' && req.method === 'GET') {
      const sc = actif ? lireScript(actif) : null
      // script.md peut aussi être modifié à la main (ou par ./cliplex) : sa date compte dans la version.
      const version = sc ? `${sc.id}@${sc.majLe}@${statSync(join(dossierScript(sc.id), 'script.md'), { throwIfNoEntry: false })?.mtimeMs ?? 0}` : ''
      return repondre(res, 200, 'application/json', JSON.stringify({ titre: sc?.titre ?? '', texte: sc?.texte ?? '', version, reglages: lireReglagesPrompteur() }))
    }
    if (route === 'reglages' && req.method === 'POST') {
      let corps = ''
      req.on('data', (b) => (corps += b).length > 10000 && req.destroy())
      req.on('end', () => {
        try {
          const { vitesse, taille, miroir } = JSON.parse(corps) as ReglagesPrompteur
          repondre(res, 200, 'application/json', JSON.stringify(ecrireReglagesPrompteur({ vitesse, taille, miroir })))
        } catch {
          repondre(res, 400, 'text/plain; charset=utf-8', 'Réglages illisibles')
        }
      })
      return
    }
    repondre(res, 404, 'text/plain; charset=utf-8', 'Introuvable')
  })
  return new Promise((resolve, reject) => {
    // Port fixe si possible (l'adresse ne change pas d'une fois sur l'autre), sinon un port libre.
    s.once('error', (e: NodeJS.ErrnoException) => {
      if (e.code !== 'EADDRINUSE') return reject(e)
      s.listen(0, '0.0.0.0')
    })
    s.on('listening', () => {
      const a = s.address()
      port = typeof a === 'object' && a ? a.port : PORT
      serveur = s
      resolve()
    })
    s.listen(PORT, '0.0.0.0')
  })
}

/** Adresse de l'ordinateur sur le Wi-Fi (ou le câble), celle que le téléphone peut joindre. */
function adresseLocale(): string | null {
  const interfaces = networkInterfaces()
  const noms = Object.keys(interfaces).sort((a, b) => Number(b === 'en0') - Number(a === 'en0'))
  for (const nom of noms) {
    if (/^(utun|awdl|llw|bridge|vmnet|docker)/.test(nom)) continue
    for (const i of interfaces[nom] ?? []) if (i.family === 'IPv4' && !i.internal) return i.address
  }
  return null
}

export async function ouvrirPrompteur(id: string): Promise<Prompteur> {
  if (!lireScript(id)) throw new Error(`Script introuvable : ${id}`)
  await demarrer()
  actif = id
  const ip = adresseLocale()
  return { script: id, telephone: ip ? `http://${ip}:${port}/p/${jeton}/` : null, ordinateur: `http://127.0.0.1:${port}/p/${jeton}/` }
}

export async function fenetrePrompteur(id: string): Promise<void> {
  const p = await ouvrirPrompteur(id)
  if (fenetre && !fenetre.isDestroyed()) {
    fenetre.loadURL(p.ordinateur)
    return fenetre.focus()
  }
  fenetre = new BrowserWindow({ width: 1000, height: 720, minWidth: 480, minHeight: 360, title: 'Prompteur', backgroundColor: '#000000', webPreferences: { sandbox: true, contextIsolation: true } })
  fenetre.setMenuBarVisibility(false)
  fenetre.loadURL(p.ordinateur)
  fenetre.on('closed', () => (fenetre = null))
}

export function arreterPrompteur(): Promise<void> {
  fenetre?.close()
  actif = null
  const s = serveur
  serveur = null
  return new Promise((resolve) => (s ? s.close(() => resolve()) : resolve()))
}
