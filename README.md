# PhotoApp

## Présentation du projet

PhotoApp est une application mobile (React Native/Expo) connectée à un backend Node.js/Express et MongoDB. Elle permet de capturer des photos géolocalisées, de les stocker (GridFS), puis de les explorer via une galerie, une carte et un calendrier.

## Installation et lancement

### Backend (app/backend)
- Installer les dépendances: `npm install`
- Démarrer: `npm run dev`

### Frontend (app/PhotoApp)
- Installer: `npm install`
- Configurer `API_URL` dans `services/api.ts` (mettre l'ip locale pour expo, ou ip pour l'émulateur Android)
- Lancer: `npx expo start`

## Modèles, vues, templates

### Modèle (backend)
**Photo** (`backend/src/models/Photo.js`): métadonnées (nom, type MIME, taille), position (latitude, longitude), timestamp, tags, et référence GridFS. Miniatures générées à la volée via `GET /api/photos/:id/thumbnail`.

### Vues/Routes (backend)
- `POST /api/photos/upload` (upload + GPS + timestamp)
- `GET /api/photos` (liste/filtre)
- `GET /api/photos/map` (données carte)
- `GET /api/photos/calendar` (groupé par date)
- `GET /api/photos/:id`
- `GET /api/photos/:id/download`
- `GET /api/photos/:id/thumbnail`

### Vues (frontend, Expo Router)
- `app/(tabs)/photos.tsx` (galerie)
- `app/(tabs)/map.tsx` (carte)
- `app/(tabs)/calendar.tsx` (calendrier)
- `app/(tabs)/camera.tsx` (prise de vue)

Les images utilisent les URLs renvoyées par l'API (`thumbnailUrl`, `downloadUrl`).
