const mongoose = require('mongoose');

// Schéma pour la géolocalisation
const locationSchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: true,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    required: true,
    min: -180,
    max: 180
  },
  address: {
    type: String,
    default: null
  }
}, { _id: false });

// Schéma principal pour les photos
const photoSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    unique: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^image\/(jpeg|jpg|png|gif|webp)$/i.test(v);
      },
      message: 'Type de fichier non supporté. Formats acceptés: JPEG, PNG, GIF, WebP'
    }
  },
  size: {
    type: Number,
    required: true,
    min: 0
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  location: {
    type: locationSchema,
    required: true
  },
  timestamp: {
    type: Date,
    required: true,
    validate: {
      validator: function(v) {
        return v <= new Date();
      },
      message: 'La date de prise de photo ne peut pas être dans le futur'
    }
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  // Référence vers le fichier GridFS
  gridfsId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  // Référence vers l'utilisateur propriétaire (optionnel pour compatibilité)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  // Métadonnées optionnelles
  metadata: {
    width: Number,
    height: Number,
    orientation: Number,
    camera: {
      make: String,
      model: String
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour les requêtes géospatiales
photoSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });
photoSchema.index({ timestamp: -1 });
photoSchema.index({ uploadDate: -1 });
photoSchema.index({ tags: 1 });

// Virtual pour l'URL de téléchargement
photoSchema.virtual('downloadUrl').get(function() {
  return `/photos/${this._id}/download`;
});

// Virtual pour l'URL de la miniature
photoSchema.virtual('thumbnailUrl').get(function() {
  return `/photos/${this._id}/thumbnail`;
});

// Méthode pour formater la date pour le calendrier
photoSchema.methods.getCalendarDate = function() {
  return {
    year: this.timestamp.getFullYear(),
    month: this.timestamp.getMonth(),
    day: this.timestamp.getDate(),
    date: this.timestamp.toISOString().split('T')[0]
  };
};

// Méthode pour obtenir les coordonnées pour la carte
photoSchema.methods.getMapCoordinates = function() {
  return {
    id: this._id,
    latitude: this.location.latitude,
    longitude: this.location.longitude,
    title: this.originalName,
    timestamp: this.timestamp,
    thumbnailUrl: this.thumbnailUrl
  };
};

// Méthode statique pour rechercher par proximité géographique
photoSchema.statics.findNearby = function(latitude, longitude, maxDistance = 1000) {
  return this.find({
    'location.latitude': {
      $gte: latitude - (maxDistance / 111320),
      $lte: latitude + (maxDistance / 111320)
    },
    'location.longitude': {
      $gte: longitude - (maxDistance / (111320 * Math.cos(latitude * Math.PI / 180))),
      $lte: longitude + (maxDistance / (111320 * Math.cos(latitude * Math.PI / 180)))
    }
  });
};

// Méthode statique pour rechercher par période
photoSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    timestamp: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  }).sort({ timestamp: -1 });
};

// Middleware pre-save pour validation
photoSchema.pre('save', function(next) {
  // Validation de la cohérence des dates
  if (this.timestamp > this.uploadDate) {
    this.uploadDate = this.timestamp;
  }
  next();
});

module.exports = mongoose.model('Photo', photoSchema);
