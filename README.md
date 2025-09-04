# PhotoApp

## 📱 Présentation du projet

PhotoApp est une application mobile complète permettant de capturer, stocker et visualiser des photos géolocalisées. L'application offre une interface intuitive avec plusieurs vues pour explorer vos photos : galerie, carte et calendrier.

## 🚀 Fonctionnalités

- **Prise de photos** avec géolocalisation automatique
- **Stockage sécurisé** dans MongoDB via GridFS
- **Visualisation par date** (calendrier)
- **Visualisation sur carte** des lieux de prise de vue
- **Génération automatique** de miniatures
- **Interface utilisateur** intuitive et responsive

## 📋 Prérequis

- Node.js >= 16.0.0
- MongoDB >= 4.4
- Expo CLI (`npm install -g expo-cli`)
- Un émulateur Android/iOS ou un appareil physique

## 🛠️ Installation et lancement

### Backend

1. Naviguez vers le dossier backend :
   ```bash
   cd backend
   ```

2. Installez les dépendances :
   ```bash
   npm install --legacy-peer-deps
   ```

3. Copiez le fichier .env.example en .env et configurez vos variables d'environnement :
   ```bash
   cp .env.example .env
   ```

4. **⚠️ Important** : Modifiez la variable `HOST_IP` dans le fichier .env pour correspondre à l'adresse IP de votre machine :
   - Pour un émulateur Android : `10.0.2.2`
   - Pour un appareil physique : votre adresse IP locale (ex: `192.168.1.62`)

5. Initialisez la base de données :
   ```bash
   node scripts/setup-db.js
   ```

6. Lancez le serveur backend :
   ```bash
   node scripts/start-dev.js
   ```

### Frontend

1. Naviguez vers le dossier PhotoApp :
   ```bash
   cd PhotoApp
   ```

2. Installez les dépendances :
   ```bash
   npm install
   ```

3. **⚠️ Important** : Vérifiez que la variable `API_URL` dans `services/api.ts` pointe vers la bonne adresse IP :
   ```javascript
   export const API_URL = 'http://IP:3000'; // Pour émulateur Android
   // ou
   export const API_URL = 'http://IP:3000'; // Pour appareil physique
   ```
⚠️⚠️ ADAPTER A VOTRE ADRESSE IP ⚠️⚠️


4. Lancez l'application :
   ```bash
   npx expo start
   ```

## 🏗️ Architecture et technologies utilisées

### Backend
- **Framework** : Node.js avec Express
- **Base de données** : MongoDB avec GridFS pour le stockage des photos
- **Modèles** :
  - `Photo` : Stocke les métadonnées des photos (géolocalisation, timestamp, etc.)
- **Middleware** :
  - Validation des données avec Joi
  - Gestion des erreurs centralisée
  - Upload de fichiers avec Multer

### Frontend
- **Framework** : React Native avec Expo
- **Navigation** : Expo Router avec navigation par onglets
- **Composants principaux** :
  - Camera : Capture de photos avec expo-camera
  - Photos : Galerie d'images
  - Map : Affichage des photos sur une carte avec expo-maps
  - Calendar : Organisation des photos par date

## 📡 API Endpoints

### Photos
- `POST /api/photos/upload` - Upload d'une photo avec métadonnées
- `GET /api/photos` - Liste des photos (avec filtres)
- `GET /api/photos/:id` - Récupérer une photo spécifique
  

### Données pour l'app
- `GET /api/photos/map` - Photos avec coordonnées pour la carte
- `GET /api/photos/calendar` - Photos groupées par date pour le calendrier
- `GET /api/photos/:id/download` - Télécharger une photo en taille réelle
- `GET /api/photos/:id/thumbnail` - Télécharger la miniature d'une photo

## 🗃️ Structure des données

### Photo
```javascript
{
  _id: ObjectId,
  filename: String,
  originalName: String,
  mimeType: String,
  size: Number,
  uploadDate: Date,
  location: {
    latitude: Number,
    longitude: Number,
    address: String // optionnel
  },
  timestamp: Date, // moment de la prise de photo
  tags: [String] // optionnel
}
```

## 📸 Screenshots

![Écran Caméra](screenshots/camera.png)
![Galerie Photos](screenshots/gallery.png)
![Vue Carte](screenshots/map.png)
![Vue Calendrier](screenshots/calendar.png)

## 👥 Répartition des tâches

### Backend
- Configuration MongoDB et GridFS
- Développement des API REST
- Validation des données et gestion d'erreurs
- Optimisation des requêtes et des performances

### Frontend
- Interface utilisateur avec React Native
- Intégration de la caméra et géolocalisation
- Développement des vues galerie, carte et calendrier
- Communication avec le backend

## 🔧 Configuration

Variables d'environnement dans `.env` :
- `MONGODB_URI` - URI de connexion MongoDB
- `PORT` - Port du serveur (défaut: 3000)
- `HOST_IP` - Adresse IP du serveur (crucial pour l'accès depuis l'app mobile)
- `NODE_ENV` - Environnement (development/production)
- `UPLOAD_MAX_SIZE` - Taille max des uploads (défaut: 10MB)
