// Types partagés entre le processus principal, le preload et l'interface.

export type Objectif = 'montage' | 'planification' | 'tournage' | 'formation' | 'youtube' | 'courts'

export interface Reglages {
  /** Accueil terminé : on ouvre directement l'application. */
  accueilFini: boolean
  objectifs: Objectif[]
  /** Dossier Cliplex : outils, projets, inspirations, style. Supprimer ce dossier efface tout. */
  dossier: string | null
}

export type EtatOutil = 'present' | 'absent' | 'installation' | 'erreur'

export interface Outil {
  id: string
  nom: string
  /** Ce que l'outil fait dans le montage, en une phrase simple. */
  role: string
  /** Commande exacte lancée pour l'installer, affichée telle quelle. */
  commande: string
  /** Taille approximative téléchargée. */
  taille: string
  /** Doit se faire dans le Terminal (mot de passe, questions). */
  terminal?: boolean
  etat: EtatOutil
  version?: string
  chemin?: string
}

export interface LigneJournal {
  outil: string
  texte: string
  type: 'commande' | 'sortie' | 'succes' | 'erreur' | 'note'
}

export interface EtatClaude {
  installe: boolean
  connecte: boolean
  detail?: string
}

export interface EtatChrome {
  /** Google Chrome est installé. */
  chrome: boolean
  /** L'extension Claude est installée dans au moins un profil Chrome. */
  extension: boolean
}

export type TypeInspiration = 'video' | 'image' | 'lien'

export interface Inspiration {
  id: string
  type: TypeInspiration
  titre: string
  /** Nom du fichier dans media/, ou adresse du lien. */
  source: string
  note?: string
  ajouteLe: string
  etat: 'nouvelle' | 'analyse' | 'analysee' | 'erreur'
  style?: string
  resume?: string
  regles?: string[]
  analyseLe?: string
  erreur?: string
}

/** Une ligne d'activité, affichée de façon lisible (action, message de Claude) ou dans le détail technique. */
export interface Activite {
  texte: string
  genre?: 'action' | 'message' | 'info' | 'technique' | 'erreur' | 'succes'
  /** Nom d'une icône de l'interface. */
  icone?: string
  /** Les actions d'un même groupe qui se suivent sont réunies (« Regarde 12 images »). */
  groupe?: string
}

export interface LigneInspiration extends Activite {
  /** Id de l'inspiration, ou « style » pendant la synthèse. */
  id: string
}

export interface Question {
  id: string
  question: string
  pourquoi?: string
  choix?: string[]
  reponse?: string
}

export interface Theme {
  accent?: string
  texte?: string
  fond?: string
  police?: string
  policeTitre?: string
}

export interface Style {
  existe: boolean
  nom?: string
  resume?: string
  theme?: Theme
  questions: Question[]
  majLe?: string
  /** Inspirations prises en compte. */
  sources: string[]
  /** Contenu de style.md. */
  texte?: string
}

export type Genre = 'formation' | 'youtube' | 'court' | 'pub'

export interface Projet {
  id: string
  titre: string
  format: '9x16' | '16x9' | '1x1' | '4x5'
  /** Genre de vidéo : règles de montage adaptées (formation par défaut). */
  genre?: Genre
  /** Applique le style tiré des inspirations (oui par défaut s'il existe). */
  avecStyle?: boolean
  consignes: string
  rushs: { nom: string; taille: number }[]
  creeLe: string
  majLe: string
  statut: 'brouillon' | 'pret' | 'montage' | 'a-valider' | 'monte'
  /** Étape en cours pendant un montage. */
  etape?: EtapeMontage
  /** Brouillon à regarder avant l'export, relatif au dossier du projet. */
  brouillon?: string
  /** Ce que Claude a fait (montage/resume.md). */
  resume?: string
  /** Qualité du dernier export. */
  qualite?: Qualite
  /** Vidéo finale, relative au dossier du projet. */
  video?: string
  erreur?: string
}

export type EtapeMontage = 'preparation' | 'claude' | 'validation' | 'rendu' | 'fini'

/** Export final : taille du format (1080p) ou deux fois plus grand (4K). */
export type Qualite = 'hd' | '4k'

export interface LigneMontage extends Activite {
  id: string
  etape: EtapeMontage
}

/** Un script à lire au prompteur : <dossier>/scripts/<id>/script.json, et le texte dans script.md. */
export interface Script {
  id: string
  titre: string
  /** Contenu de script.md : paragraphes séparés par une ligne vide, « # Partie » pour un repère. */
  texte: string
  creeLe: string
  majLe: string
}

/** Réglages du prompteur, partagés par tous les scripts : <dossier>/scripts/prompteur.json. */
export interface ReglagesPrompteur {
  /** De 0,5 à 10 : environ 0,15 ligne par seconde par point. */
  vitesse: number
  /** Taille du texte en pixels, de 24 à 160. */
  taille: number
  /** Texte inversé, pour une vitre de prompteur. */
  miroir: boolean
  majLe?: string
}

/** Prompteur ouvert : adresses de la page, sur le téléphone (même Wi-Fi) et sur l'ordinateur. */
export interface Prompteur {
  script: string
  /** Null quand l'ordinateur n'est sur aucun réseau. */
  telephone: string | null
  ordinateur: string
}

export interface Api {
  reglages: {
    lire(): Promise<Reglages>
    ecrire(partiel: Partial<Reglages>): Promise<Reglages>
    choisirDossier(): Promise<string | null>
  }
  outils: {
    lister(): Promise<Outil[]>
    installer(id: string): Promise<boolean>
    journal(rappel: (ligne: LigneJournal) => void): () => void
  }
  claude: {
    etat(): Promise<EtatClaude>
    connecter(): Promise<void>
    chrome(): Promise<EtatChrome>
    installerExtension(): Promise<void>
  }
  inspirations: {
    lister(): Promise<Inspiration[]>
    /** Ouvre le sélecteur de fichiers (vidéos, images). */
    ajouterFichiers(): Promise<Inspiration[]>
    /** Fichiers glissés dans la fenêtre. */
    deposer(chemins: string[]): Promise<Inspiration[]>
    ajouterLien(url: string, note: string): Promise<Inspiration>
    supprimer(id: string): Promise<void>
    analyser(id: string): Promise<Inspiration>
    arreter(id: string): Promise<void>
    journal(rappel: (ligne: LigneInspiration) => void): () => void
    /** Adresse lisible par <img> ou <video> pour un fichier de l'inspiration. */
    adresse(id: string, fichier: string): string
    /** Chemin local d'un fichier glissé dans la fenêtre. */
    cheminDe(fichier: File): string
  }
  style: {
    lire(): Promise<Style>
    synthetiser(): Promise<Style>
    repondre(question: string, reponse: string): Promise<Style>
    modifierTexte(texte: string): Promise<Style>
  }
  projets: {
    lister(): Promise<Projet[]>
    creer(titre: string, format: Projet['format'], genre: Genre): Promise<Projet>
    modifier(id: string, partiel: Partial<Projet>): Promise<Projet>
    ajouterRushs(id: string): Promise<Projet>
    ouvrirDossier(id: string): Promise<void>
    /** Adresse lisible par la balise <video> pour un fichier du projet. */
    adresse(id: string, fichier: string): string
  }
  scripts: {
    lister(): Promise<Script[]>
    creer(titre: string): Promise<Script>
    modifier(id: string, partiel: Partial<Pick<Script, 'titre' | 'texte'>>): Promise<Script>
    /** Le script part à la corbeille du Mac. */
    supprimer(id: string): Promise<void>
  }
  prompteur: {
    /** Lance le serveur local si besoin et y place ce script. */
    ouvrir(id: string): Promise<Prompteur>
    /** Le même prompteur dans une fenêtre de l'ordinateur. */
    fenetre(id: string): Promise<void>
    arreter(): Promise<void>
    reglages(): Promise<ReglagesPrompteur>
    ecrireReglages(partiel: Partial<ReglagesPrompteur>): Promise<ReglagesPrompteur>
  }
  montage: {
    lancer(id: string): Promise<Projet>
    /** Après le brouillon : Claude corrige ce que la personne demande et rend un nouveau brouillon. */
    retoucher(id: string, demande: string): Promise<Projet>
    /** Brouillon validé : rendu final. */
    exporter(id: string, qualite: Qualite): Promise<Projet>
    arreter(id: string): Promise<void>
    journal(rappel: (ligne: LigneMontage) => void): () => void
  }
}
