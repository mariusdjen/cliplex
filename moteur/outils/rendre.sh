#!/bin/bash
# Compile le plan, rend la vidéo, masterise le son (CIBLE LUFS, défaut -10, crête -1 dBTP) et génère les planches de contrôle.
# Usage : [FORMAT=9x16|16x9|1x1|4x5] [CIBLE=-10] [ECHELLE=1] rendre.sh <dossier_montage> [--brouillon]
# Variables : CLIPLEX_STUDIO (studio Remotion installé), CLIPLEX_OUTILS (Python), CLIPLEX_SONS (défaut : kit du dépôt),
# CLIPLEX_MUSIQUE / CLIPLEX_NAVIGATEUR (facultatives), LIMITE (secondes sans progrès avant d'arrêter un morceau, défaut 300).
set -e
ICI="$(cd "$(dirname "$0")" && pwd)"; . "$ICI/environnement.sh" studio
M="$(cd "$1" && pwd)"; STUDIO="$CLIPLEX_STUDIO"
export CLIPLEX_SONS="${CLIPLEX_SONS:-$ICI/../sons}"
PY="$CLIPLEX_OUTILS/python/bin/python"; [ -x "$PY" ] || PY=python3
"$PY" -I "$ICI/compiler.py" "$M"
PUBLIC="$(dirname "$M")/.$(basename "$M").public"
SCALE=${ECHELLE:-1}; [ "$2" == "--brouillon" ] && SCALE=0.5
SORTIE="montage.mp4"; [ -n "$FORMAT" ] && [ "$FORMAT" != "9x16" ] && SORTIE="montage_${FORMAT}.mp4"; [ "$2" == "--brouillon" ] && SORTIE="${SORTIE%.mp4}_brouillon.mp4"
TL="$M/timeline.json"
N=$("$PY" -c "import json;print(json.load(open('$TL'))['timeline']['duree'])"); PAS=${MORCEAU:-900}
# Composants écrits pour ce montage (montage/composants/*.tsx) : copiés dans le studio avec un point
# d'entrée propre au projet, pour que deux projets ne se mélangent jamais.
ENTREE=src/index.ts
if ls "$M"/composants/*.tsx >/dev/null 2>&1; then
  CLE=$(echo "$M" | md5 | cut -c1-10); P="$STUDIO/src/projets/$CLE"
  rm -rf "$P"; mkdir -p "$P/composants"; cp -R "$M"/composants/ "$P/composants/"
  {
    echo 'import { registerRoot } from "remotion";'; echo 'import { Root } from "../../Root";'; echo 'import { PERSO } from "../../perso";'
    k=0; for c in "$P"/composants/*.tsx; do n=$(basename "$c" .tsx); echo "import C$k from \"./composants/$n\";"; echo "PERSO[\"$n\"] = C$k;"; k=$((k+1)); done
    echo 'registerRoot(Root);'
  } > "$P/index.ts"
  ENTREE="src/projets/$CLE/index.ts"
fi
RENDU=(npx remotion render "$ENTREE" Montage --props="$TL" --public-dir="$PUBLIC")
# Navigateur de rendu. macOS refuse à ses processus auxiliaires l'accès au Bureau, aux Documents, aux
# Téléchargements, à iCloud et aux disques externes : il plante au démarrage (« icudtl.dat not found »).
# Le studio est alors cloné (APFS, sans place en plus) dans les caches du Mac, et c'est ce clone qui rend.
NAV="${CLIPLEX_NAVIGATEUR:-}"
if [ -z "$NAV" ]; then
  case "$(cd "$STUDIO" && pwd -P)" in
    "$HOME"/Desktop/*|"$HOME"/Documents/*|"$HOME"/Downloads/*|"$HOME/Library/Mobile Documents"/*|/Volumes/*)
      B=$(ls -d "$STUDIO"/node_modules/.remotion/chrome-headless-shell/*/chrome-headless-shell-* 2>/dev/null | head -1)
      if [ -n "$B" ]; then
        V=$(cat "$STUDIO/node_modules/.remotion/chrome-headless-shell/VERSION" 2>/dev/null || echo 0)
        CACHE="$HOME/Library/Caches/Cliplex/navigateur-$V"
        if [ ! -x "$CACHE/chrome-headless-shell" ]; then
          rm -rf "$CACHE" "$CACHE.part"; mkdir -p "$(dirname "$CACHE")"
          cp -cR "$B" "$CACHE.part" 2>/dev/null || cp -R "$B" "$CACHE.part"; mv "$CACHE.part" "$CACHE"
        fi
        NAV="$CACHE/chrome-headless-shell"
      fi ;;
  esac
fi
[ -n "$NAV" ] && RENDU+=(--browser-executable="$NAV")
# Lance un rendu en surveillant qu'il avance : sans nouvelle ligne de progression pendant LIMITE secondes,
# il est arrêté (avec son navigateur) et compte comme un essai raté. Seules les erreurs sont affichées.
surveiller() {
  local log="$M/_morceaux/rendu.log" pid
  : > "$log"; set -m; "$@" > "$log" 2>&1 & pid=$!; set +m
  while kill -0 $pid 2>/dev/null; do
    sleep 3
    if [ $(( $(date +%s) - $(stat -f %m "$log") )) -gt ${LIMITE:-300} ]; then
      echo "Le rendu n'avance plus depuis $(( ${LIMITE:-300} / 60 )) min : arrêt de ce morceau."
      kill -TERM -$pid 2>/dev/null; sleep 2; kill -KILL -$pid 2>/dev/null; break
    fi
  done
  wait $pid 2>/dev/null || true
  grep -vE "^(Rendered|Encoded|Bundl|Getting|Copying|Composition|Codec|Output|Concurrency|Rendering|Stitching|\+ |    at|\[http|$)" "$log" | grep -vi "time remaining" || true
}
# Rendu par morceaux de PAS images (30 s), chacun relancé jusqu'à 3 fois ; les morceaux déjà rendus
# pour la même timeline sont gardés (reprise après une coupure).
EMP=$( (cat "$TL"; cat "$M"/composants/* 2>/dev/null) | md5)-$SCALE; [ "$(cat "$M/_morceaux/empreinte" 2>/dev/null)" == "$EMP" ] || rm -rf "$M/_morceaux"
mkdir -p "$M/_morceaux"; echo "$EMP" > "$M/_morceaux/empreinte"; : > "$M/_morceaux/liste.txt"
cd "$STUDIO"
for ((a=0; a<N; a+=PAS)); do
  b=$((a+PAS-1)); [ $b -ge $N ] && b=$((N-1)); f="$M/_morceaux/m_$(printf %06d $a).mp4"
  for essai in 1 2 3; do
    [ -f "$f" ] && break
    surveiller "${RENDU[@]}" "$f" --frames=$a-$b --muted --scale=$SCALE
    [ -f "$f" ] && break; echo "Morceau $a-$b : nouvel essai ($essai)"
  done
  [ -f "$f" ] || { echo "ÉCHEC DU RENDU (images $a-$b)"; exit 1; }
  echo "file '$f'" >> "$M/_morceaux/liste.txt"; echo "Images $((b+1)) / $N"
done
# son en une fois (rapide) puis assemblage sans réencodage de l'image
"$PY" -c "import json,sys;d=json.load(open(sys.argv[1]));T=d.get('timeline',d);T['audioSeul']=True;json.dump({'timeline':T},open(sys.argv[2],'w'))" "$TL" "$M/_morceaux/son.json"
SON=("${RENDU[@]}"); SON[5]="--props=$M/_morceaux/son.json"
for essai in 1 2 3; do SANS_CRF=1 surveiller "${SON[@]}" "$M/_morceaux/son.wav" --codec=wav; [ -f "$M/_morceaux/son.wav" ] && break; done
ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i "$M/_morceaux/liste.txt" -i "$M/_morceaux/son.wav" -map 0:v -map 1:a -c:v copy -c:a pcm_s16le "$M/_brut.mov"
[ -f "$M/_brut.mov" ] || { echo "ÉCHEC DU RENDU (assemblage)"; exit 1; }
ffmpeg -hide_banner -loglevel error -y -i "$M/_brut.mov" -c:v copy -c:a aac -b:a 320k "$M/_brut.mp4" && rm -rf "$M/_brut.mov" "$M/_morceaux"
[ -f "$M/_brut.mp4" ] || { echo "ÉCHEC DU RENDU"; exit 1; }
# Mastering son : normalisation loudness en 2 passes
J=$(ffmpeg -hide_banner -i "$M/_brut.mp4" -af loudnorm=I=${CIBLE:--10}:TP=-1:LRA=8:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
g() { echo "$J" | "$PY" -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
ffmpeg -hide_banner -loglevel error -y -i "$M/_brut.mp4" -c:v copy \
  -af "loudnorm=I=${CIBLE:--10}:TP=-1:LRA=8:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true,aresample=48000" \
  -c:a aac -b:a 320k -movflags +faststart "$M/$SORTIE"
rm -f "$M/_brut.mp4"
# Contrôle : planches 2 images/s + mesure finale
mkdir -p "$M/controle"; rm -f "$M"/controle/*.jpg
ffmpeg -hide_banner -loglevel error -i "$M/$SORTIE" -vf "fps=2,scale=216:-2,tile=6x4:padding=4:color=white" -fps_mode vfr "$M/controle/planche_%02d.jpg"
ffmpeg -hide_banner -i "$M/$SORTIE" -af ebur128=peak=true -f null - 2>&1 | grep -A12 Summary | grep -E " I:| Peak:" | tr -s ' '
echo "OK → $M/$SORTIE"
