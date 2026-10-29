#!/bin/bash
# Variables des scripts du moteur, pour qu'ils marchent aussi lancés seuls (Terminal, Claude Code).
# L'app et ./cliplex les donnent déjà ; sinon le dossier Cliplex est retrouvé comme le fait ./cliplex :
# CLIPLEX_DOSSIER, sinon celui choisi dans l'app, sinon <dépôt>/espace.
# À sourcer : . "$ICI/environnement.sh" [studio]   (studio : le moteur d'animation est aussi nécessaire)
if [ -z "${CLIPLEX_OUTILS:-}" ]; then
  _depot="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  _d="${CLIPLEX_DOSSIER:-}"
  _r="$HOME/Library/Application Support/Cliplex/reglages.json"
  [ -z "$_d" ] && [ -f "$_r" ] && _d="$(plutil -extract dossier raw -o - "$_r" 2>/dev/null || true)"
  if [ -z "$_d" ] || [ "$_d" == "null" ]; then _d="$_depot/espace"
  elif [ -f "$_d/cliplex" ] && [ -d "$_d/moteur/outils" ]; then _d="$_d/espace"
  elif [ -d "$_d/outils" ] || [ -d "$_d/projets" ] || [ -d "$_d/inspirations" ] || [ -d "$_d/style" ]; then :
  elif [ "$(basename "$_d" | tr '[:upper:]' '[:lower:]')" != "cliplex" ]; then _d="$_d/Cliplex"
  fi
  export CLIPLEX_OUTILS="$_d/outils"
  [ -z "${CLIPLEX_POLICES:-}" ] && export CLIPLEX_POLICES="$_d/bibliotheque/polices"
fi
export CLIPLEX_STUDIO="${CLIPLEX_STUDIO:-$CLIPLEX_OUTILS/studio}"
# Puis les outils déjà sur le Mac (Homebrew), comme ./cliplex.
export PATH="$CLIPLEX_OUTILS/bin:$CLIPLEX_OUTILS/node/bin:$PATH:/opt/homebrew/bin:/usr/local/bin"

if [ ! -d "$CLIPLEX_OUTILS" ]; then
  echo "Outils Cliplex introuvables ($CLIPLEX_OUTILS). Lance d'abord l'installation : ./cliplex installer" >&2; exit 1
fi
if ! command -v ffmpeg >/dev/null; then
  echo "ffmpeg est introuvable. Lance d'abord l'installation : ./cliplex installer ffmpeg" >&2; exit 1
fi
if [ "${1:-}" == "studio" ] && [ ! -d "$CLIPLEX_STUDIO/node_modules/remotion" ]; then
  echo "Le moteur d'animation n'est pas installé ($CLIPLEX_STUDIO). Lance d'abord : ./cliplex installer studio" >&2; exit 1
fi
