# ArtWall 3D Studio

Progetta la tua stanza in 3D, posiziona arredi, porte e finestre e trova la disposizione perfetta per i tuoi quadri.

![React](https://img.shields.io/badge/React-19-61dafb) ![Three.js](https://img.shields.io/badge/Three.js-r186-black) ![Vite](https://img.shields.io/badge/Vite-8-646cff)

## Funzionalità

- **Vista 3D** con pareti forate per porte e finestre, pavimenti procedurali (parquet, gres, resina), arredi modellati (divani, letti, tavoli, librerie) e pareti “a sezione” che si nascondono automaticamente quando ostruiscono la vista.
- **Vista frontale parete** con trascinamento dei quadri, guide magnetiche (centro parete, altezza occhi, allineamento con le altre opere), quote in tempo reale e segnalazione delle collisioni.
- **Pianta 2D** per spostare gli arredi, disegnare stanze irregolari (a L, a U…) aggiungendo o trascinando vertici.
- **Disposizione automatica**: composizioni centrate sul mobile, simmetriche, a griglia e salon wall calcolate sugli spazi liberi.
- **Guida di montaggio** stampabile con la posizione esatta di ogni chiodo.
- **Annulla / Ripeti**, salvataggio automatico nel browser, versioni dei progetti, import/export JSON ed esportazione PNG della vista 3D.
- Interfaccia responsive (desktop, tablet e smartphone) e scorciatoie da tastiera (premi `?`).

## Sviluppo locale

```bash
npm install
npm run dev
```

L'app è disponibile su <http://localhost:3000>.

```bash
npm run lint   # type-check
npm run build  # build di produzione in dist/
```

## Pubblicazione su GitHub Pages

Il workflow `.github/workflows/deploy.yml` compila e pubblica il sito a ogni push su `main`.

1. Su GitHub apri **Settings → Pages** e in **Build and deployment → Source** scegli **GitHub Actions**.
2. Fai push su `main` (o avvia manualmente il workflow da **Actions → Deploy to GitHub Pages → Run workflow**).
3. Il sito sarà online su `https://<utente>.github.io/ArtWall-3D-Studio/`.

Il percorso base viene letto automaticamente da `actions/configure-pages`; in assenza viene usato un base relativo (`./`), quindi la build funziona con qualunque nome di repository.

Nota: la visibilità di GitHub Pages su repository privati richiede un piano GitHub che lo supporti.
