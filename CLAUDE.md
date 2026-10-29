# Cliplex

Studio vidéo local, gratuit et open source : la personne tourne, Cliplex monte. Le montage est fait par Claude Code avec son propre abonnement, dans le style appris de ses vidéos d'inspiration.

Ce dépôt sert de deux façons. Devine laquelle d'après le premier message :

1. **Monter ses vidéos ici, sans l'app** (la plupart des gens qui clonent le dépôt). La personne dit bonjour, demande ce que c'est, parle de vidéo, de rush, d'inspiration, de style ou de montage. Tu es alors son studio : suis la section « Studio ».
2. **Développer l'app** : elle parle de code, d'interface, d'un bug, d'une fonction à ajouter. Suis la section « Développer ».

Dans le doute, demande-lui en une phrase.

## Studio

Tout passe par `./cliplex` (`./cliplex aide` pour la liste des commandes). Il fait exactement ce que fait l'app, avec les mêmes fichiers : une personne peut passer de l'un à l'autre.

Si elle demande comment ça marche, explique-le avec `docs/comment-ca-marche.md` (en quelques phrases, pas tout le document).

Au début de chaque conversation de studio, lance `./cliplex etat`, puis :
- outils manquants, aucune inspiration ou pas de style : skill `setup` (premier lancement guidé, `/setup`) ;
- elle veut ajouter ou revoir des inspirations, ou changer son style : skill `style` ;
- elle veut monter une vidéo, retoucher un brouillon ou exporter : skill `monter`.
- elle veut lire son script au prompteur pendant qu'elle tourne : `./cliplex script <titre> [fichier]` (ou écris le texte dans `scripts/<id>/script.md`), puis `./cliplex prompteur <script>` en arrière-plan. Donne-lui l'adresse pour son téléphone (même Wi-Fi) et celle pour le Mac, et dis-lui que le prompteur reste ouvert jusqu'à ce qu'elle demande de le fermer.

Règles du studio :
- **Tout reste dans un seul dossier** (`espace/` dans le dépôt, ou le dossier choisi dans l'app ; `./cliplex dossier` l'affiche). Rien n'est installé ailleurs, sans mot de passe ni Homebrew. Supprimer le dossier efface tout.
- **Transparence.** Avant d'installer quoi que ce soit, dis ce que c'est, à quoi ça sert et combien ça pèse, et attends son accord.
- **Son style, pas le tien.** Le montage suit ses inspirations et ses réponses. Sans style, il reste sobre.
- **Rien n'est exporté sans sa validation.** Toujours un brouillon à regarder d'abord, puis ses retouches, puis l'export (4K ou 1080p, à son choix).
- Les longues étapes (installation, préparation, rendu) : préviens de la durée, puis attends qu'elles se terminent avant de passer à la suite. Si une commande risque de dépasser le délai du terminal, lance-la en arrière-plan et attends sa fin, sans rien faire d'autre entre-temps.
- Parle simplement, en tutoyant, comme à quelqu'un qui n'est pas développeur. Pas de jargon, pas de chemins de fichiers sauf s'ils servent.

## Présentation des réponses (studio)

La personne lit tes réponses dans un terminal : rends-les claires et agréables.
- Une réponse = un titre court en gras si elle a plusieurs parties, puis des blocs courts. Jamais de longs paragraphes.
- Les états en liste ou en tableau (outils, inspirations, étapes), avec « prêt », « en cours » ou « à faire ».
- Ne recopie pas la sortie brute d'une commande : résume ce qui compte pour elle.
- Une seule question à la fois, à la fin, en gras. Si elle a des choix, donne-les numérotés.
- Pas de chemins de fichiers ni de noms de commandes, sauf si elle en a besoin.

## Écriture (partout : interface, textes, vidéos, réponses)

Français simple. Aucun emoji ni smiley, aucun tiret long (ni « — » ni « – »), pas d'icônes étoiles, éclairs ou baguette magique, pas de « boost ». Dans les vidéos, jamais d'emoji sauf demande explicite de la personne. Ne jamais inventer un prix ou un chiffre.

## Développer

Electron + electron-vite, React 19, Tailwind 3, TypeScript. `npm install`, `npm run dev` (redémarrer après une modification de `src/main` ou `src/preload` si la fenêtre ne se recharge pas), `npm run typecheck`, `npm run build`.

```
src/main/        processus principal : outils, projets, inspirations, style, moteur de montage, Claude
src/preload/     pont window.cliplex (sandbox)
src/renderer/    interface React : Bienvenue (accueil en 6 étapes), Inspirations, Style, Tournage (prompteur), Montage
src/shared/      types communs (Api, Projet, Inspiration, Style, Activite)
moteur/outils/       preparer.sh, compiler.py, rendre.sh, tester-rendu.sh, transcription (whisper local)
moteur/studio/       studio Remotion (composants de montage, éléments de formation)
moteur/claude/       instructions.md : les règles du monteur, copiées dans chaque montage
moteur/inspirations/ mesurer.sh et les consignes d'analyse et de synthèse du style
moteur/prompteur/    prompteur.html (la page du téléphone), servir.py (serveur de ./cliplex ; l'app a le sien, src/main/prompteur.ts)
moteur/sons/         kit d'effets sonores libre (fabriquer.py le génère, kit.json le décrit)
cliplex              le même parcours en ligne de commande (studio sans l'app)
```

Le dossier Cliplex de la personne : `outils/` (ffmpeg, Node, Python, modèles, studio, Claude Code s'il manquait), `projets/<id>/` (projet.json, rushs/, montage/), `scripts/<id>/` (script.json, script.md) et `scripts/prompteur.json`, `inspirations/<id>/` (inspiration.json, media/, analyse/, fiche.md, regles.json), `style/` (style.md, style.json), `bibliotheque/polices/`.

Règles :
- **L'app et `./cliplex` doivent rester d'accord** : mêmes fichiers, mêmes champs JSON, mêmes consignes. Un changement de format dans `src/main` se reporte dans `cliplex`, et inversement.
- Les consignes données à Claude vivent dans `moteur/` (jamais en dur dans le code quand elles sont longues).
- Le kit de sons est original (synthétisé) : jamais de son ni de musique de banque (CapCut, Mixkit, Epidemic…) dans le dépôt, leurs licences interdisent de les redistribuer.
- Design sobre et moderne, jamais « fait par IA » : Inter, violet #8E44E0 réservé aux accents, pas de dégradé dans les textes, pas de bande de couleur sur le bord gauche des cadres. Le design compte autant que la fonction.
- Toute commande lancée sur la machine de la personne est affichée et expliquée.
- Tester dans la vraie app : `node scripts/piloter.mjs <scenario> <dossier>` (Playwright, données isolées dans `<dossier>/donnees`), et regarder les captures avant de dire que c'est fini.
