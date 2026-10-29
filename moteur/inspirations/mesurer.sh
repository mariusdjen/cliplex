#!/bin/bash
# Mesures d'une vidéo d'inspiration, pour que Claude la « voie » en entier :
#   analyse/planches/p*.jpg  images à intervalle régulier (24 planches au plus)
#   analyse/dossier.md       format, durée, coupes, silences, transcription horodatée
# Usage : mesurer.sh <dossier_inspiration>   (la vidéo est dans media/)
set -e
. "$(dirname "$0")/../outils/environnement.sh"
D="$(cd "$1" && pwd)"; A="$D/analyse"
V="$(ls "$D"/media/* | head -1)"; [ -f "$V" ] || { echo "Aucune vidéo dans media/"; exit 1; }
PY="$CLIPLEX_OUTILS/python/bin/python"; [ -x "$PY" ] || PY=python3
rm -rf "$A"; mkdir -p "$A/planches"
DUREE=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$V")
# 2 images par seconde pour une vidéo courte, moins pour une longue : 20 images par planche, 24 planches au plus.
FPS=$("$PY" -c "print(round(min(2, 480/max(1, $DUREE)), 4))")
echo "Durée : ${DUREE%.*} s, $FPS image(s) par seconde."
ffmpeg -hide_banner -i "$V" -vf "select='gt(scene,0.25)',showinfo" -f null - 2>&1 | grep -o 'pts_time:[0-9.]*' | cut -d: -f2 > "$A/coupes.txt" || true
ffmpeg -hide_banner -loglevel error -i "$V" -vf "fps=$FPS,scale=256:-2,tile=5x4:padding=4:color=white" -fps_mode vfr "$A/planches/p%02d.jpg"
ffmpeg -hide_banner -i "$V" -af silencedetect=n=-35dB:d=0.25 -f null - 2>&1 | grep -E 'silence_(start|end)' > "$A/silences.txt" || true
ffmpeg -hide_banner -loglevel error -y -ss "$("$PY" -c "print(min(3, $DUREE/3))")" -i "$V" -frames:v 1 -vf scale=480:-2 "$A/apercu.jpg" || true
if ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$V" | grep -q .; then
  ffmpeg -hide_banner -loglevel error -y -i "$V" -ar 16000 -ac 1 "$A/audio.wav"
fi
ffprobe -v error -show_entries format=duration:stream=codec_type,width,height,r_frame_rate -of json "$V" > "$A/format.json"
"$PY" -I "$(dirname "$0")/mesures.py" "$A" "$FPS"
echo "$(wc -l < "$A/coupes.txt" | tr -d ' ') coupes, $(ls "$A/planches" | wc -l | tr -d ' ') planches."
