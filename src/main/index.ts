import { app, BrowserWindow, dialog, ipcMain, net, protocol, shell } from 'electron'
import { is } from '@electron-toolkit/utils'
import { writeFileSync } from 'fs'
import { join, normalize } from 'path'
import { pathToFileURL } from 'url'
import type { Activite, Genre, LigneJournal, Projet, Qualite, Reglages, ReglagesPrompteur, Script } from '../shared/types'
import { connecterClaude, etatChrome, etatClaude, installerExtension } from './claude'
import { installerOutil, listerOutils } from './outils'
import { copierRushs, creerProjet, dossierProjet, listerProjets, modifierProjet } from './projets'
import { avecSousDossier, ecrireReglages, lireReglages } from './reglages'
import { arreterMontage, exporterMontage, lancerMontage, retoucherMontage } from './moteur'
import { arreterPrompteur, fenetrePrompteur, ouvrirPrompteur } from './prompteur'
import { creerScript, ecrireReglagesPrompteur, lireReglagesPrompteur, listerScripts, modifierScript, supprimerScript } from './scripts'
import {
  ajouterFichiers,
  ajouterLien,
  analyserInspiration,
  arreterInspiration,
  dossierInspiration,
  lireStyle,
  listerInspirations,
  modifierStyleTexte,
  repondreQuestion,
  supprimerInspiration,
  synthetiserStyle
} from './inspirations'

let fenetre: BrowserWindow | null = null

function creerFenetre(): void {
  fenetre = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    title: 'Cliplex',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#F4F4F5',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true
    }
  })
  fenetre.on('ready-to-show', () => fenetre?.show())
  // Les liens externes s'ouvrent dans le navigateur, jamais dans l'app.
  fenetre.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  // Développement : CLIPLEX_ETAPE ouvre l'accueil à cette étape, CLIPLEX_PAGE l'app sur cette page.
  if (is.dev && process.env.ELECTRON_RENDERER_URL) fenetre.loadURL(`${process.env.ELECTRON_RENDERER_URL}?etape=${process.env.CLIPLEX_ETAPE ?? ''}&page=${process.env.CLIPLEX_PAGE ?? ''}`)
  else fenetre.loadFile(join(__dirname, '../renderer/index.html'))
  if (is.dev && process.env.CLIPLEX_CAPTURE) capturerEnBoucle(process.env.CLIPLEX_CAPTURE)
}

// Développement : capture la fenêtre toutes les 2 s dans <dossier>/ecran.png,
// pour vérifier l'interface sans intervention.
function capturerEnBoucle(dossier: string): void {
  setInterval(async () => {
    const image = await fenetre?.webContents.capturePage()
    if (image) writeFileSync(join(dossier, 'ecran.png'), image.toPNG())
  }, 2000)
}

function journal(ligne: LigneJournal): void {
  fenetre?.webContents.send('outils:journal', ligne)
}

function brancherIpc(): void {
  ipcMain.handle('reglages:lire', () => lireReglages())
  ipcMain.handle('reglages:ecrire', (_e, partiel: Partial<Reglages>) => ecrireReglages(partiel))
  ipcMain.handle('reglages:choisirDossier', async () => {
    const r = await dialog.showOpenDialog(fenetre!, {
      title: 'Dossier de travail Cliplex',
      buttonLabel: 'Choisir ce dossier',
      properties: ['openDirectory', 'createDirectory']
    })
    return r.canceled ? null : avecSousDossier(r.filePaths[0])
  })

  ipcMain.handle('outils:lister', () => listerOutils())
  ipcMain.handle('outils:installer', (_e, id: string) => installerOutil(id, journal))

  ipcMain.handle('claude:etat', () => etatClaude())
  ipcMain.handle('claude:connecter', () => connecterClaude())
  ipcMain.handle('claude:chrome', () => etatChrome())
  ipcMain.handle('claude:installerExtension', () => installerExtension())

  const journalInspiration = (id: string, a: Activite) => fenetre?.webContents.send('inspirations:journal', { id, ...a })
  ipcMain.handle('inspirations:lister', () => listerInspirations())
  ipcMain.handle('inspirations:ajouterFichiers', async () => {
    const r = await dialog.showOpenDialog(fenetre!, {
      title: 'Ajouter des inspirations',
      buttonLabel: 'Ajouter',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Vidéos et images', extensions: ['mp4', 'mov', 'm4v', 'webm', 'mkv', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'] }]
    })
    return r.canceled ? [] : ajouterFichiers(r.filePaths)
  })
  ipcMain.handle('inspirations:deposer', (_e, chemins: string[]) => ajouterFichiers(chemins))
  ipcMain.handle('inspirations:ajouterLien', (_e, url: string, note: string) => ajouterLien(url, note))
  ipcMain.handle('inspirations:supprimer', (_e, id: string) => supprimerInspiration(id))
  ipcMain.handle('inspirations:analyser', (_e, id: string) => analyserInspiration(id, journalInspiration))
  ipcMain.handle('inspirations:arreter', (_e, id: string) => arreterInspiration(id))

  ipcMain.handle('style:lire', () => lireStyle())
  ipcMain.handle('style:synthetiser', () => synthetiserStyle(journalInspiration))
  ipcMain.handle('style:repondre', (_e, question: string, reponse: string) => repondreQuestion(question, reponse))
  ipcMain.handle('style:modifierTexte', (_e, texte: string) => modifierStyleTexte(texte))

  ipcMain.handle('projets:lister', () => listerProjets())
  ipcMain.handle('projets:creer', (_e, titre: string, format: Projet['format'], genre: Genre) => creerProjet(titre, format, genre))
  ipcMain.handle('projets:modifier', (_e, id: string, partiel: Partial<Projet>) => modifierProjet(id, partiel))
  ipcMain.handle('projets:ajouterRushs', async (_e, id: string) => {
    const r = await dialog.showOpenDialog(fenetre!, {
      title: 'Ajouter des rushs',
      buttonLabel: 'Ajouter',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Vidéos', extensions: ['mp4', 'mov', 'm4v', 'webm', 'mkv'] }]
    })
    return r.canceled ? modifierProjet(id, {}) : copierRushs(id, r.filePaths)
  })
  ipcMain.handle('projets:ouvrirDossier', (_e, id: string) => shell.openPath(dossierProjet(id)))

  ipcMain.handle('scripts:lister', () => listerScripts())
  ipcMain.handle('scripts:creer', (_e, titre: string) => creerScript(titre))
  ipcMain.handle('scripts:modifier', (_e, id: string, partiel: Partial<Pick<Script, 'titre' | 'texte'>>) => modifierScript(id, partiel))
  ipcMain.handle('scripts:supprimer', (_e, id: string) => supprimerScript(id))

  ipcMain.handle('prompteur:ouvrir', (_e, id: string) => ouvrirPrompteur(id))
  ipcMain.handle('prompteur:fenetre', (_e, id: string) => fenetrePrompteur(id))
  ipcMain.handle('prompteur:arreter', () => arreterPrompteur())
  ipcMain.handle('prompteur:reglages', () => lireReglagesPrompteur())
  ipcMain.handle('prompteur:ecrireReglages', (_e, partiel: Partial<ReglagesPrompteur>) => ecrireReglagesPrompteur(partiel))

  ipcMain.handle('montage:lancer', (_e, id: string) =>
    lancerMontage(id, (etape, a) => fenetre?.webContents.send('montage:journal', { id, etape, ...a }))
  )
  ipcMain.handle('montage:retoucher', (_e, id: string, demande: string) =>
    retoucherMontage(id, demande, (etape, a) => fenetre?.webContents.send('montage:journal', { id, etape, ...a }))
  )
  ipcMain.handle('montage:exporter', (_e, id: string, qualite: Qualite) =>
    exporterMontage(id, qualite, (etape, a) => fenetre?.webContents.send('montage:journal', { id, etape, ...a }))
  )
  ipcMain.handle('montage:arreter', (_e, id: string) => arreterMontage(id))
}

// Lecture des fichiers par l'interface : cliplex-fichier://projet/<id>/<chemin>
// ou cliplex-fichier://inspiration/<id>/<chemin>, limitée au dossier de cet élément.
function brancherProtocole(): void {
  protocol.handle('cliplex-fichier', (requete) => {
    const url = new URL(requete.url)
    const [id, ...reste] = url.pathname.split('/').filter(Boolean).map(decodeURIComponent)
    if (!id) return new Response('Interdit', { status: 403 })
    const racine = url.hostname === 'inspiration' ? dossierInspiration(id) : dossierProjet(id)
    const chemin = normalize(join(racine, ...reste))
    if (!chemin.startsWith(racine + '/')) return new Response('Interdit', { status: 403 })
    return net.fetch(pathToFileURL(chemin).toString(), { headers: requete.headers })
  })
}

protocol.registerSchemesAsPrivileged([{ scheme: 'cliplex-fichier', privileges: { stream: true, supportFetchAPI: true, standard: true, secure: true } }])
app.setName('Cliplex')
// Développement : données isolées (réglages, état de l'accueil) pour les essais.
if (is.dev && process.env.CLIPLEX_DONNEES) app.setPath('userData', process.env.CLIPLEX_DONNEES)
app.whenReady().then(() => {
  brancherIpc()
  brancherProtocole()
  creerFenetre()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) creerFenetre()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
