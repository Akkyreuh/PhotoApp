const moment = require('moment');

/**
 * Formater une réponse API standardisée
 * @param {boolean} success - Statut de succès
 * @param {any} data - Données à retourner
 * @param {string} message - Message optionnel
 * @param {object} meta - Métadonnées optionnelles
 * @returns {object} Réponse formatée
 */
const formatResponse = (success, data = null, message = null, meta = null) => {
  const response = { success };
  
  if (data !== null) response.data = data;
  if (message) response.message = message;
  if (meta) response.meta = meta;
  
  return response;
};

/**
 * Formater une réponse d'erreur
 * @param {string} message - Message d'erreur
 * @param {any} details - Détails optionnels de l'erreur
 * @returns {object} Réponse d'erreur formatée
 */
const formatError = (message, details = null) => {
  const error = { message };
  if (details) error.details = details;
  
  return { success: false, error };
};

/**
 * Calculer la distance entre deux points GPS (formule de Haversine)
 * @param {number} lat1 - Latitude du point 1
 * @param {number} lon1 - Longitude du point 1
 * @param {number} lat2 - Latitude du point 2
 * @param {number} lon2 - Longitude du point 2
 * @returns {number} Distance en mètres
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Rayon de la Terre en mètres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

/**
 * Générer une bounding box autour d'un point
 * @param {number} latitude - Latitude du centre
 * @param {number} longitude - Longitude du centre
 * @param {number} radiusInMeters - Rayon en mètres
 * @returns {object} Bounding box avec ne et sw
 */
const generateBoundingBox = (latitude, longitude, radiusInMeters) => {
  const latDelta = radiusInMeters / 111320; // 1 degré de latitude ≈ 111320 mètres
  const lonDelta = radiusInMeters / (111320 * Math.cos(latitude * Math.PI / 180));

  return {
    northEast: {
      latitude: latitude + latDelta,
      longitude: longitude + lonDelta
    },
    southWest: {
      latitude: latitude - latDelta,
      longitude: longitude - lonDelta
    }
  };
};

/**
 * Formater une date pour l'affichage
 * @param {Date} date - Date à formater
 * @param {string} format - Format désiré (défaut: 'DD/MM/YYYY HH:mm')
 * @returns {string} Date formatée
 */
const formatDate = (date, format = 'DD/MM/YYYY HH:mm') => {
  return moment(date).format(format);
};

/**
 * Obtenir le début et la fin d'une période
 * @param {string} period - Période ('day', 'week', 'month', 'year')
 * @param {Date} date - Date de référence (défaut: maintenant)
 * @returns {object} Objet avec start et end
 */
const getPeriodRange = (period, date = new Date()) => {
  const momentDate = moment(date);
  
  switch (period) {
    case 'day':
      return {
        start: momentDate.startOf('day').toDate(),
        end: momentDate.endOf('day').toDate()
      };
    case 'week':
      return {
        start: momentDate.startOf('week').toDate(),
        end: momentDate.endOf('week').toDate()
      };
    case 'month':
      return {
        start: momentDate.startOf('month').toDate(),
        end: momentDate.endOf('month').toDate()
      };
    case 'year':
      return {
        start: momentDate.startOf('year').toDate(),
        end: momentDate.endOf('year').toDate()
      };
    default:
      throw new Error('Période non supportée');
  }
};

/**
 * Générer un nom de fichier unique
 * @param {string} originalName - Nom original du fichier
 * @param {string} prefix - Préfixe optionnel
 * @returns {string} Nom de fichier unique
 */
const generateUniqueFilename = (originalName, prefix = '') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  const extension = originalName.split('.').pop();
  
  return `${prefix}${timestamp}_${random}.${extension}`;
};

/**
 * Valider les coordonnées GPS
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {boolean} True si valides
 */
const isValidCoordinates = (latitude, longitude) => {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
};

/**
 * Nettoyer et valider les tags
 * @param {string} tagsString - Chaîne de tags séparés par des virgules
 * @returns {Array} Tableau de tags nettoyés
 */
const cleanTags = (tagsString) => {
  if (!tagsString || typeof tagsString !== 'string') {
    return [];
  }
  
  return tagsString
    .split(',')
    .map(tag => tag.trim().toLowerCase())
    .filter(tag => tag.length > 0 && tag.length <= 50)
    .slice(0, 10); // Limiter à 10 tags maximum
};

/**
 * Créer une pagination
 * @param {number} page - Page actuelle
 * @param {number} limit - Limite par page
 * @param {number} total - Total d'éléments
 * @returns {object} Objet de pagination
 */
const createPagination = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null
  };
};

module.exports = {
  formatResponse,
  formatError,
  calculateDistance,
  generateBoundingBox,
  formatDate,
  getPeriodRange,
  generateUniqueFilename,
  isValidCoordinates,
  cleanTags,
  createPagination
};
