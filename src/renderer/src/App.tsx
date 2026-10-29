import { useEffect, useState } from 'react'
import type { Projet, Reglages } from '../../shared/types'
import { BarreHaut, Coquille, type Page } from './composants/Coquille'
import { Icone } from './composants/Icone'
import { Bienvenue } from './pages/Bienvenue'
import { Inspirations } from './pages/Inspirations'
import { Montage } from './pages/Montage'
import { MonStyle } from './pages/Style'
import { Tournage } from './pages/Tournage'

const A_VENIR: Partial<Record<Page, { titre: string; texte: string }>> = {
  idees: { titre: 'Idées et scripts', texte: 'Tes idées par thème, ta trame dictée à la voix et mise en forme en script.' },
  planning: { titre: 'Planning', texte: 'Ton calendrier de publication, avec les créneaux que tu choisis.' },
  sons: { titre: 'Sons et musiques', texte: 'Une banque de sons libres de droits, et les tiens.' }
}

export default function App() {
  const [reglages, setReglages] = useState<Reglages | null>(null)
  const [page, setPage] = useState<Page>(() => (new URLSearchParams(location.search).get('page') as Page) || 'accueil')
  const [projets, setProjets] = useState<Projet[]>([])
  const [claude, setClaude] = useState('Vérification…')

  const rafraichir = () => window.cliplex.projets.lister().then(setProjets)

  useEffect(() => {
    window.cliplex.reglages.lire().then(setReglages)
  }, [])

  useEffect(() => {
    if (!reglages?.accueilFini) return
    rafraichir()
    const lire = () => window.cliplex.claude.etat().then((e) => setClaude(!e.installe ? 'Non installé' : e.connecte ? 'Connecté' : 'Non connecté'))
    lire()
    const t = setInterval(lire, 15000)
    return () => clearInterval(t)
  }, [reglages?.accueilFini])

  if (!reglages) return null
  if (!reglages.accueilFini) return <Bienvenue reglages={reglages} onFini={setReglages} />

  return (
    <Coquille page={page} onPage={setPage} compteur={{ montage: projets.length }} claude={claude}>
      {page === 'accueil' && <Accueil projets={projets} onPage={setPage} />}
      {page === 'montage' && <Montage onChange={rafraichir} />}
      {page === 'inspirations' && <Inspirations onStyle={() => setPage('style')} />}
      {page === 'tournage' && <Tournage />}
      {page === 'style' && <MonStyle onInspirations={() => setPage('inspirations')} />}
      {A_VENIR[page] && <AVenir {...A_VENIR[page]!} />}
    </Coquille>
  )
}

function Accueil({ projets, onPage }: { projets: Projet[]; onPage: (p: Page) => void }) {
  return (
    <>
      <BarreHaut>
        <b className="text-[13px] font-semibold">Accueil</b>
      </BarreHaut>
      <div className="overflow-y-auto px-10 py-9">
        <h1 className="text-[24px] font-bold tracking-[-0.02em]">Bonjour</h1>
        <p className="mt-1.5 text-[14px] text-muet">Tu tournes, Cliplex monte. Par quoi on commence ?</p>
        <div className="mt-7 grid max-w-[880px] grid-cols-3 gap-3">
          {[
            { page: 'montage' as Page, titre: 'Monter une vidéo', texte: 'Dépose ton rush et tes consignes.' },
            { page: 'inspirations' as Page, titre: 'Ajouter des inspirations', texte: 'Des vidéos que tu aimes : Claude en tire ton style.' },
            { page: 'style' as Page, titre: 'Mon style', texte: 'Ce que Claude applique à chaque montage.' }
          ].map((c) => (
            <button key={c.titre} onClick={() => onPage(c.page)} className="carte p-5 text-left hover:border-[#D4D4D8]">
              <b className="block text-[14px] font-semibold">{c.titre}</b>
              <span className="mt-1 block text-[12.5px] text-muet">{c.texte}</span>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-violet">
                Ouvrir
                <Icone nom="fleche" taille={14} />
              </span>
            </button>
          ))}
        </div>
        <h2 className="mt-10 text-[15px] font-bold">Vidéos récentes</h2>
        <div className="mt-3 max-w-[880px]">
          {projets.length === 0 ? (
            <p className="text-[13px] text-muet">Aucune vidéo pour l'instant.</p>
          ) : (
            <div className="carte divide-y divide-bord-2">
              {projets.slice(0, 6).map((p) => (
                <button key={p.id} onClick={() => onPage('montage')} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-fond">
                  <b className="flex-1 truncate text-[13px] font-semibold">{p.titre}</b>
                  <span className="text-[12px] text-muet">{new Date(p.majLe).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function AVenir({ titre, texte }: { titre: string; texte: string }) {
  return (
    <>
      <BarreHaut>
        <b className="text-[13px] font-semibold">{titre}</b>
      </BarreHaut>
      <div className="grid flex-1 place-items-center">
        <div className="max-w-sm text-center">
          <h2 className="text-[18px] font-bold">{titre}</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muet">{texte}</p>
          <p className="mt-4 text-[12px] text-doux">Arrive dans une prochaine version.</p>
        </div>
      </div>
    </>
  )
}
