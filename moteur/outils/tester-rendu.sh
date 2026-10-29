#!/bin/bash
# Rendu d'essai d'une seconde avec le vrai moteur (même navigateur, mêmes sons que pour les vidéos).
# Lancé à la fin de l'installation du moteur d'animation : une panne se voit tout de suite, pas au premier montage.
ICI="$(cd "$(dirname "$0")" && pwd)"; . "$ICI/environnement.sh" studio; T="$(mktemp -d)"; mkdir -p "$T/montage"
printf '{"format":{"largeur":640,"hauteur":360},"mode":"motion","duree":1,"evenements":[{"type":"chapitre","mot":0,"duree":1,"titre":"Cliplex"}]}' > "$T/montage/plan.json"
echo "Rendu d'essai…"
if MORCEAU=30 LIMITE=180 "$ICI/rendre.sh" "$T/montage" --brouillon > "$T/journal" 2>&1 && [ -f "$T/montage/montage_brouillon.mp4" ]; then
  echo "Rendu d'essai réussi."; rm -rf "$T"
else
  echo "Le rendu d'essai a échoué :"; tail -8 "$T/journal"; rm -rf "$T"; exit 1
fi
