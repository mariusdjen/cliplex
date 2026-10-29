import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { Api, LigneInspiration, LigneJournal, LigneMontage } from '../shared/types'

const api: Api = {
  reglages: {
    lire: () => ipcRenderer.invoke('reglages:lire'),
    ecrire: (partiel) => ipcRenderer.invoke('reglages:ecrire', partiel),
    choisirDossier: () => ipcRenderer.invoke('reglages:choisirDossier')
  },
  outils: {
    lister: () => ipcRenderer.invoke('outils:lister'),
    installer: (id) => ipcRenderer.invoke('outils:installer', id),
    journal: (rappel) => {
      const ecoute = (_e: unknown, ligne: LigneJournal) => rappel(ligne)
      ipcRenderer.on('outils:journal', ecoute)
      return () => ipcRenderer.removeListener('outils:journal', ecoute)
    }
  },
  claude: {
    etat: () => ipcRenderer.invoke('claude:etat'),
    connecter: () => ipcRenderer.invoke('claude:connecter'),
    chrome: () => ipcRenderer.invoke('claude:chrome'),
    installerExtension: () => ipcRenderer.invoke('claude:installerExtension')
  },
  inspirations: {
    lister: () => ipcRenderer.invoke('inspirations:lister'),
    ajouterFichiers: () => ipcRenderer.invoke('inspirations:ajouterFichiers'),
    deposer: (chemins) => ipcRenderer.invoke('inspirations:deposer', chemins),
    ajouterLien: (url, note) => ipcRenderer.invoke('inspirations:ajouterLien', url, note),
    supprimer: (id) => ipcRenderer.invoke('inspirations:supprimer', id),
    analyser: (id) => ipcRenderer.invoke('inspirations:analyser', id),
    arreter: (id) => ipcRenderer.invoke('inspirations:arreter', id),
    journal: (rappel) => {
      const ecoute = (_e: unknown, ligne: LigneInspiration) => rappel(ligne)
      ipcRenderer.on('inspirations:journal', ecoute)
      return () => ipcRenderer.removeListener('inspirations:journal', ecoute)
    },
    adresse: (id, fichier) => `cliplex-fichier://inspiration/${encodeURIComponent(id)}/${fichier.split('/').map(encodeURIComponent).join('/')}`,
    cheminDe: (fichier) => webUtils.getPathForFile(fichier)
  },
  style: {
    lire: () => ipcRenderer.invoke('style:lire'),
    synthetiser: () => ipcRenderer.invoke('style:synthetiser'),
    repondre: (question, reponse) => ipcRenderer.invoke('style:repondre', question, reponse),
    modifierTexte: (texte) => ipcRenderer.invoke('style:modifierTexte', texte)
  },
  projets: {
    lister: () => ipcRenderer.invoke('projets:lister'),
    creer: (titre, format, genre) => ipcRenderer.invoke('projets:creer', titre, format, genre),
    modifier: (id, partiel) => ipcRenderer.invoke('projets:modifier', id, partiel),
    ajouterRushs: (id) => ipcRenderer.invoke('projets:ajouterRushs', id),
    ouvrirDossier: (id) => ipcRenderer.invoke('projets:ouvrirDossier', id),
    adresse: (id, fichier) => `cliplex-fichier://projet/${encodeURIComponent(id)}/${fichier.split('/').map(encodeURIComponent).join('/')}`
  },
  scripts: {
    lister: () => ipcRenderer.invoke('scripts:lister'),
    creer: (titre) => ipcRenderer.invoke('scripts:creer', titre),
    modifier: (id, partiel) => ipcRenderer.invoke('scripts:modifier', id, partiel),
    supprimer: (id) => ipcRenderer.invoke('scripts:supprimer', id)
  },
  prompteur: {
    ouvrir: (id) => ipcRenderer.invoke('prompteur:ouvrir', id),
    fenetre: (id) => ipcRenderer.invoke('prompteur:fenetre', id),
    arreter: () => ipcRenderer.invoke('prompteur:arreter'),
    reglages: () => ipcRenderer.invoke('prompteur:reglages'),
    ecrireReglages: (partiel) => ipcRenderer.invoke('prompteur:ecrireReglages', partiel)
  },
  montage: {
    lancer: (id) => ipcRenderer.invoke('montage:lancer', id),
    retoucher: (id, demande) => ipcRenderer.invoke('montage:retoucher', id, demande),
    exporter: (id, qualite) => ipcRenderer.invoke('montage:exporter', id, qualite),
    arreter: (id) => ipcRenderer.invoke('montage:arreter', id),
    journal: (rappel) => {
      const ecoute = (_e: unknown, ligne: LigneMontage) => rappel(ligne)
      ipcRenderer.on('montage:journal', ecoute)
      return () => ipcRenderer.removeListener('montage:journal', ecoute)
    }
  }
}

contextBridge.exposeInMainWorld('cliplex', api)
