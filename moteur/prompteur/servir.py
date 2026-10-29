"""Sert le prompteur sur le réseau local, pour ./cliplex prompteur (l'app fait de même dans src/main/prompteur.ts).

    python servir.py <dossier Cliplex> <script> <adresse Wi-Fi ou vide>

Mêmes adresses que l'app :
    /p/<jeton>/           la page (prompteur.html)
    /p/<jeton>/etat       { titre, texte, version, reglages }
    /p/<jeton>/reglages   POST { vitesse, taille, miroir }, enregistrés dans scripts/prompteur.json
"""

import json
import os
import secrets
import sys
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

DOSSIER, SCRIPT, IP = sys.argv[1], sys.argv[2], sys.argv[3]
SCRIPTS = os.path.join(DOSSIER, "scripts")
PAGE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "prompteur.html")
DEFAUT = {"vitesse": 3, "taille": 48, "miroir": False}
JETON = secrets.token_urlsafe(9)
BASE = f"/p/{JETON}"


def maintenant():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def lire_reglages():
    try:
        with open(os.path.join(SCRIPTS, "prompteur.json")) as f:
            return {**DEFAUT, **json.load(f)}
    except Exception:
        return dict(DEFAUT)


def ecrire_reglages(partiel):
    r = {**lire_reglages(), **{k: partiel[k] for k in ("vitesse", "taille", "miroir") if k in partiel}}
    r["vitesse"] = min(10, max(0.5, float(r["vitesse"] or DEFAUT["vitesse"])))
    r["taille"] = min(160, max(24, round(float(r["taille"] or DEFAUT["taille"]))))
    r["miroir"] = bool(r["miroir"])
    r["majLe"] = maintenant()
    with open(os.path.join(SCRIPTS, "prompteur.json"), "w") as f:
        json.dump(r, f, indent=2)
    return r


def etat():
    d = os.path.join(SCRIPTS, SCRIPT)
    with open(os.path.join(d, "script.json")) as f:
        s = json.load(f)
    md = os.path.join(d, "script.md")
    texte = open(md, encoding="utf-8").read() if os.path.exists(md) else ""
    # Le texte peut être modifié à la main pendant le tournage : le téléphone le recharge.
    version = f"{SCRIPT}@{s.get('majLe', '')}@{os.path.getmtime(md) if os.path.exists(md) else 0}"
    return {"titre": s.get("titre", ""), "texte": texte, "version": version, "reglages": lire_reglages()}


class Prompteur(BaseHTTPRequestHandler):
    def repondre(self, code, type_, corps):
        donnees = corps.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", type_)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(donnees)))
        self.end_headers()
        self.wfile.write(donnees)

    def route(self):
        chemin = self.path.split("?")[0]
        return chemin[len(BASE) + 1 :] if chemin.startswith(BASE + "/") else None

    def do_GET(self):
        if self.path.split("?")[0] == BASE:
            self.send_response(302)
            self.send_header("Location", BASE + "/")
            return self.end_headers()
        r = self.route()
        if r == "":
            return self.repondre(200, "text/html; charset=utf-8", open(PAGE, encoding="utf-8").read())
        if r == "etat":
            return self.repondre(200, "application/json", json.dumps(etat(), ensure_ascii=False))
        self.repondre(404, "text/plain; charset=utf-8", "Introuvable")

    def do_POST(self):
        if self.route() != "reglages":
            return self.repondre(404, "text/plain; charset=utf-8", "Introuvable")
        try:
            longueur = min(int(self.headers.get("Content-Length", 0)), 10000)
            r = ecrire_reglages(json.loads(self.rfile.read(longueur)))
            self.repondre(200, "application/json", json.dumps(r))
        except Exception:
            self.repondre(400, "text/plain; charset=utf-8", "Réglages illisibles")

    def log_message(self, *_):
        pass


try:
    serveur = ThreadingHTTPServer(("0.0.0.0", 4848), Prompteur)
except OSError:
    # 4848 est pris (l'app a déjà son prompteur ouvert, par exemple) : un port libre.
    serveur = ThreadingHTTPServer(("0.0.0.0", 0), Prompteur)
port = serveur.server_address[1]
print(f"Script : {etat()['titre']}")
if IP:
    print(f"Sur ton téléphone (même Wi-Fi) : http://{IP}:{port}{BASE}/")
else:
    print("Ton Mac n'est sur aucun réseau : le téléphone ne pourra pas l'ouvrir.")
print(f"Sur ce Mac : http://127.0.0.1:{port}{BASE}/")
print("Ctrl+C pour fermer le prompteur.", flush=True)
try:
    serveur.serve_forever()
except KeyboardInterrupt:
    pass
