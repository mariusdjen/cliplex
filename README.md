# Cliplex

**Tu tournes, ta vidéo est montée.**

Cliplex est un studio vidéo qui tourne sur ton ordinateur. Tu déposes ton rush, et Claude fait le montage dans ton style : coupes, chapitres, encarts, captures d'écran, zooms, sous-titres, transitions, effets sonores, et tout le motion design que tu lui décris. Pour les formations, les vidéos YouTube, les Shorts, Reels et TikTok.

Gratuit et open source. Tu branches simplement ton propre compte Claude.

![Écran de montage](docs/ecran-montage.png)

## Démarrer (avec Claude Code)

La façon la plus simple aujourd'hui : tout se fait dans Claude Code, sans installer l'app. Il te faut un Mac et Claude Code avec un abonnement Claude Pro ou Max ; le reste s'installe tout seul.

```bash
git clone https://github.com/mariusdjen/cliplex.git
cd cliplex
claude
```

Dis bonjour, ou tape `/setup`. Claude t'explique ce qu'il faut, installe les outils (avec ton accord), te demande tes vidéos d'inspiration (fichiers ou liens YouTube), en tire ton style, puis monte tes vidéos. Tu regardes un brouillon, tu demandes des retouches, et rien n'est exporté (en 4K ou en 1080p) avant que tu le valides.

Tu peux tout demander pour ton montage : une ouverture animée, des transitions, des effets sonores plus marqués, ton logo, l'ambiance d'une vidéo que tu aimes. Ce que le moteur ne sait pas encore faire, Claude l'écrit pour ta vidéo. Plus tu décris précisément, plus le résultat te ressemble.

Le détail de chaque étape : [docs/comment-ca-marche.md](docs/comment-ca-marche.md).

Tout va dans le dossier `espace/` du dépôt (ou dans celui de l'app si tu l'utilises aussi : ce sont les mêmes fichiers). Le script `./cliplex` fait chaque étape : `./cliplex aide` liste ses commandes, `./cliplex etat` montre ce qui est prêt.

## Pourquoi « Cliplex »

Clip Express : ta vidéo montée en quelques minutes. Et un lexique : Cliplex apprend le style de tes vidéos préférées pour monter les tiennes de la même façon.

## Principes

- **Tout reste sur ton Mac, dans un seul dossier.** Outils, rushs, montages, inspirations et style vont dans ton dossier Cliplex. Supprime-le avec l'app, et il ne reste rien.
- **Transparence totale.** Chaque outil installé est montré, expliqué, avec la commande exacte lancée. Rien n'est caché.
- **Ton compte, tes règles.** Cliplex lance Claude Code avec ton propre abonnement. Il ne voit jamais tes identifiants.
- **Ton style, pas le nôtre.** Tu montres à Claude les vidéos que tu aimes ; il en tire ton style et l'applique à chaque montage.
- **Des fichiers normaux.** Un projet = un dossier lisible que tu peux ouvrir, copier, sauvegarder.

## État

Version 0.1, en développement actif. macOS d'abord, Windows et Linux ensuite.

| Fonction | État |
| --- | --- |
| Premier lancement guidé (besoins, objectifs, dossier, installation, Claude, inspirations) | Fait |
| Projets vidéo : genre, format, rushs, consignes | Fait |
| Brouillon à valider, retouches, export 4K ou 1080p | Fait |
| Utilisation sans l'app, depuis Claude Code (`./cliplex`) | Fait |
| Moteur de montage automatique (formation, YouTube, courts, pubs) | Fait, en amélioration |
| Inspirations (vidéos, images, liens YouTube) et style appris | Fait |
| Idées, scripts et planning | À venir |
| Prompteur sur téléphone ou sur le Mac (vitesse, taille, miroir) | Fait |
| Prompteur guidé par la voix, décor de tournage | À venir |
| Effets sonores libres (kit Cliplex, posés automatiquement) | Fait |
| Animations sur mesure écrites par Claude pour chaque vidéo | Fait |
| Musiques libres de droits | À venir |

## L'app (en développement)

Une app Mac reprend le même parcours avec une interface : accueil guidé, inspirations, style, montage, validation du brouillon. Elle n'a pas encore de version prête à installer : pour l'essayer, lance-la depuis le code.

### Installer pour développer

Prérequis : macOS, Node.js 20 ou plus.

```bash
git clone https://github.com/mariusdjen/cliplex.git
cd cliplex
npm install
npm run dev
```

Les outils de montage (ffmpeg, Node, Python et whisper, Remotion, Claude Code si besoin) s'installent depuis l'app au premier lancement, dans le dossier Cliplex, ou à la main : voir [docs/installation-manuelle.md](docs/installation-manuelle.md).

## Structure

```
cliplex              le parcours complet en ligne de commande (utilisé par Claude Code)
.claude/skills/      /setup, /style et /monter : ce que Claude fait à chaque étape
moteur/claude/       les règles du monteur, copiées dans chaque montage
moteur/inspirations/ analyse des inspirations et écriture du style
moteur/outils/       préparation du rush, transcription locale, compilation du plan, rendu
moteur/studio/       les éléments animés (Remotion) : chapitres, encarts, captures, sous-titres…
moteur/sons/         le kit d'effets sonores, original et libre
src/                 l'app Electron (React, Tailwind)
```

Tout ce que Claude doit faire est écrit en clair dans `moteur/` et `.claude/` : tu peux le lire et l'adapter.

## Contribuer

Les contributions sont les bienvenues : voir [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

[Apache 2.0](LICENSE). Le nom et le logo Cliplex ne sont pas couverts par la licence du code.

Le moteur d'animation s'appuie sur [Remotion](https://www.remotion.dev), gratuit pour les particuliers et les petites structures ; les entreprises de plus de trois personnes ont besoin d'une licence Remotion.
