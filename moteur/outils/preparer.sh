#!/bin/bash
# Prépare un ou plusieurs rushes pour le montage.
# Usage : [AUDIO=brut|propre] [PROMPT="Marque, termes…"] preparer.sh <dossier_montage> <rush1> [rush2 ...]
# Produit dans <dossier_montage>/ :
#   sources/rN.mp4      vidéo normalisée (cadence d'origine, H.264, petit côté 1080) + voix nettoyée
#   rN/mots.json        transcription mot à mot (whisper large-v3-turbo)
#   rN/planches/        1 image/s, 5x4 = 20 s par planche (pour regarder le rush)
#   rN/silences.txt     silences détectés
set -e
# Outils installés par Cliplex : CLIPLEX_OUTILS (ffmpeg, modèle whisper, modèle RNNoise, Python avec numpy et whisper).
ICI="$(cd "$(dirname "$0")" && pwd)"; . "$ICI/environnement.sh"; OUTILS="$CLIPLEX_OUTILS"
PY="$OUTILS/python/bin/python"; [ -x "$PY" ] || PY=python3
M="$1"; shift; mkdir -p "$M/sources"; i=1
for R in "$@"; do
  id="r$i"; D="$M/$id"; mkdir -p "$D/planches"
  echo "[$id] $R"
  # Voix. AUDIO=brut (défaut, rush caméra) : débruiteur neuronal RNNoise + porte de bruit entre les mots + compression + EQ + de-esser.
  #       AUDIO=propre (son déjà traité/dérushé par l'utilisateur) : RNNoise léger seulement, pas de compression.
  RNN="$OUTILS/modeles/sh.rnnn"
  if [ "${AUDIO:-brut}" == "propre" ]; then
    FILTRE="highpass=f=60,arnndn=m=$RNN:mix=0.6,loudnorm=I=-16:TP=-1.5:LRA=11"
  else
    FILTRE="highpass=f=80,arnndn=m=$RNN:mix=1,agate=threshold=0.02:ratio=3:attack=5:release=220:range=0.08,acompressor=threshold=-20dB:ratio=3.5:attack=6:release=100:makeup=3,equalizer=f=180:t=q:w=1:g=-1.5,equalizer=f=3800:t=q:w=1.2:g=2,deesser=i=0.3,loudnorm=I=-16:TP=-1.5:LRA=7"
  fi
  ffmpeg -hide_banner -loglevel error -y -i "$R" -vn -ac 1 -ar 48000 -af "$FILTRE" \
    "$D/voix.wav"
  # Vidéo : cadence d'origine conservée (25/30… ; > 30 ramené à 30), rotation appliquée, petit côté ≤ 2160 (zooms nets)
  if [ -z "$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_type -of csv=p=0 "$R")" ]; then
    # voix seule (mode vidéo animée) : image noire légère + voix nettoyée
    [ $i -eq 1 ] && echo '{"fps": 30}' > "$M/info.json"
    ffmpeg -hide_banner -loglevel error -y -f lavfi -i color=c=black:s=540x960:r=30 -i "$D/voix.wav" -map 0:v -map 1:a -shortest -c:v libx264 -preset ultrafast -crf 40 -c:a aac -b:a 256k -movflags +faststart "$M/sources/$id.mp4"
    ffmpeg -hide_banner -loglevel error -y -i "$D/voix.wav" -ar 16000 "$D/voix16k.wav"
    "$PY" "$ICI/vad.py" "$D/voix16k.wav" "$D"
    "$PY" -I "$ICI/transcrire.py" "$D" "$id" "${PROMPT:-}"
    i=$((i+1)); continue
  fi
  FPS=$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$R" | "$PY" -c "import sys;a,b=sys.stdin.read().split()[0].strip(',').split('/');f=round(int(a)/int(b));print(f if f<=30 else 30)")
  [ $i -eq 1 ] && echo "{\"fps\": $FPS}" > "$M/info.json"
  ffmpeg -hide_banner -loglevel error -y -i "$R" -i "$D/voix.wav" -map 0:v:0 -map 1:a:0 \
    -vf "fps=$FPS,scale='if(lt(iw,ih),min(iw,2160),-2)':'if(lt(iw,ih),-2,min(ih,2160))':flags=lanczos,format=yuv420p" \
    -c:v h264_videotoolbox -b:v 45M -g 15 -c:a aac -b:a 256k -movflags +faststart "$M/sources/$id.mp4"
  ffmpeg -hide_banner -loglevel error -y -i "$D/voix.wav" -ar 16000 "$D/voix16k.wav"
  # Parole/blancs calibrés sur le bruit de fond, puis transcription énoncé par énoncé (horodatages fiables)
  "$PY" "$ICI/vad.py" "$D/voix16k.wav" "$D"
  "$PY" -I "$ICI/transcrire.py" "$D" "$id" "${PROMPT:-}"
  ffmpeg -hide_banner -loglevel error -y -i "$M/sources/$id.mp4" -vf "fps=1,scale=216:-2,tile=5x4:padding=4:color=white" -fps_mode vfr "$D/planches/p%02d.jpg"
  i=$((i+1))
done
"$PY" -I "$ICI/mots.py" --fusion "$M"
echo "OK → $M/transcript.txt"
