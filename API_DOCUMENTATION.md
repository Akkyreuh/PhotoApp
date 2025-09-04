# PhotoApp Backend - Documentation API

## 🚀 Démarrage rapide

### Installation
```bash
cd backend
npm install
```

### Configuration
1. Copier `.env.example` vers `.env`
2. Modifier les variables selon votre environnement
3. Démarrer MongoDB
4. Configurer la base de données : `npm run setup-db`
5. Démarrer le serveur : `npm run dev`

## 📡 Endpoints API

### Photos

#### Upload d'une photo
```http
POST /api/photos/upload
Content-Type: multipart/form-data

Body:
- photo: File (image JPEG/PNG/GIF/WebP)
- latitude: Number (required)
- longitude: Number (required) 
- timestamp: Date (required)
- address: String (optional)
- tags: String (optional, séparés par virgules)
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "id": "64f...",
    "filename": "abc123.jpg",
    "originalName": "photo.jpg",
    "location": {
      "latitude": 48.8566,
      "longitude": 2.3522,
      "address": "Paris, France"
    },
    "timestamp": "2024-01-15T14:30:00.000Z",
    "downloadUrl": "/api/photos/64f.../download",
    "thumbnailUrl": "/api/photos/64f.../thumbnail"
  },
  "message": "Photo uploadée avec succès"
}
```

#### Récupérer les photos
```http
GET /api/photos?page=1&limit=20&startDate=2024-01-01&endDate=2024-12-31&tags=nature,voyage&latitude=48.8566&longitude=2.3522&maxDistance=1000
```

**Paramètres:**
- `page`: Numéro de page (défaut: 1)
- `limit`: Photos par page (défaut: 20, max: 100)
- `startDate`: Date de début (ISO 8601)
- `endDate`: Date de fin (ISO 8601)
- `tags`: Tags séparés par virgules
- `latitude`: Latitude pour recherche par proximité
- `longitude`: Longitude pour recherche par proximité
- `maxDistance`: Distance max en mètres (défaut: 1000)

#### Photo spécifique
```http
GET /api/photos/:id
```

#### Télécharger une photo
```http
GET /api/photos/:id/download
```

#### Miniature d'une photo
```http
GET /api/photos/:id/thumbnail?size=200
```

**Paramètres:**
- `size`: Taille de la miniature en pixels (défaut: 200)

<!-- Endpoint DELETE supprimé car non utilisé par l'application -->

### Données pour l'application

#### Photos pour la carte
```http
GET /api/photos/map?northEast=48.9,2.4&southWest=48.8,2.3&startDate=2024-01-01&endDate=2024-12-31
```

**Paramètres:**
- `northEast`: Coordonnées nord-est (latitude,longitude)
- `southWest`: Coordonnées sud-ouest (latitude,longitude)
- `startDate`: Date de début
- `endDate`: Date de fin

**Réponse:**
```json
{
  "success": true,
  "data": [
    {
      "id": "64f...",
      "latitude": 48.8566,
      "longitude": 2.3522,
      "title": "photo.jpg",
      "timestamp": "2024-01-15T14:30:00.000Z",
      "thumbnailUrl": "/api/photos/64f.../thumbnail?size=100"
    }
  ],
  "count": 25
}
```

#### Photos pour le calendrier
```http
GET /api/photos/calendar?year=2024&month=0
```

**Paramètres:**
- `year`: Année (défaut: année actuelle)
- `month`: Mois (0-11, optionnel pour toute l'année)

**Réponse:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-15",
      "count": 3,
      "photos": [
        {
          "id": "64f...",
          "originalName": "photo.jpg",
          "timestamp": "2024-01-15T14:30:00.000Z",
          "thumbnailUrl": "/api/photos/64f.../thumbnail?size=150"
        }
      ]
    }
  ],
  "period": {
    "year": 2024,
    "month": 0,
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-01-31T23:59:59.999Z"
  },
  "totalPhotos": 45
}
```

<!-- Endpoint /stats supprimé car non utilisé par l'application -->

### Santé du serveur
```http
GET /health
```

## 🔧 Codes d'erreur

- `200`: Succès
- `201`: Créé avec succès
- `400`: Requête invalide
- `404`: Ressource non trouvée
- `429`: Trop de requêtes
- `500`: Erreur serveur

## 📝 Format des erreurs

```json
{
  "success": false,
  "error": {
    "message": "Description de l'erreur",
    "details": [
      {
        "field": "latitude",
        "message": "La latitude est requise"
      }
    ]
  }
}
```

## 🔒 Sécurité

- Limitation de taux: 100 requêtes/15min par IP
- Validation des types de fichiers
- Taille max des uploads: 10MB
- Validation des coordonnées GPS
- Protection contre les injections

## 📊 Base de données

### Structure Photo
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
    address: String
  },
  timestamp: Date,
  tags: [String],
  gridfsId: ObjectId,
  metadata: {
    width: Number,
    height: Number,
    orientation: Number,
    camera: {
      make: String,
      model: String
    }
  }
}
```

### Index optimisés
- Géospatial: `location.latitude + location.longitude`
- Temporel: `timestamp`, `uploadDate`
- Tags: `tags`
- Composé: `timestamp + location`
