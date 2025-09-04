const Joi = require('joi');

// Schéma de validation pour l'upload de photos
const photoUploadSchema = Joi.object({
  latitude: Joi.number()
    .min(-90)
    .max(90)
    .required()
    .messages({
      'number.base': 'La latitude doit être un nombre',
      'number.min': 'La latitude doit être supérieure ou égale à -90',
      'number.max': 'La latitude doit être inférieure ou égale à 90',
      'any.required': 'La latitude est requise'
    }),
  
  longitude: Joi.number()
    .min(-180)
    .max(180)
    .required()
    .messages({
      'number.base': 'La longitude doit être un nombre',
      'number.min': 'La longitude doit être supérieure ou égale à -180',
      'number.max': 'La longitude doit être inférieure ou égale à 180',
      'any.required': 'La longitude est requise'
    }),
  
  timestamp: Joi.date()
    .max('now')
    .required()
    .messages({
      'date.base': 'Le timestamp doit être une date valide',
      'date.max': 'La date ne peut pas être dans le futur',
      'any.required': 'Le timestamp est requis'
    }),
  
  address: Joi.string()
    .max(200)
    .optional()
    .messages({
      'string.max': 'L\'adresse ne peut pas dépasser 200 caractères'
    }),
  
  tags: Joi.string()
    .optional()
    .messages({
      'string.base': 'Les tags doivent être une chaîne de caractères séparés par des virgules'
    })
});

// Schéma de validation pour les filtres de recherche
const photoSearchSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .optional(),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .optional(),
  
  startDate: Joi.date()
    .optional(),
  
  endDate: Joi.date()
    .min(Joi.ref('startDate'))
    .optional(),
  
  latitude: Joi.number()
    .min(-90)
    .max(90)
    .optional(),
  
  longitude: Joi.number()
    .min(-180)
    .max(180)
    .optional(),
  
  maxDistance: Joi.number()
    .min(0)
    .max(50000) // 50km max
    .default(1000)
    .optional(),
  
  tags: Joi.string()
    .optional()
});

// Schéma de validation pour les paramètres de carte
const mapParamsSchema = Joi.object({
  northEast: Joi.string()
    .pattern(/^-?\d+\.?\d*,-?\d+\.?\d*$/)
    .optional()
    .messages({
      'string.pattern.base': 'northEast doit être au format "latitude,longitude"'
    }),
  
  southWest: Joi.string()
    .pattern(/^-?\d+\.?\d*,-?\d+\.?\d*$/)
    .optional()
    .messages({
      'string.pattern.base': 'southWest doit être au format "latitude,longitude"'
    }),
  
  startDate: Joi.date().optional(),
  endDate: Joi.date().min(Joi.ref('startDate')).optional()
});

// Schéma de validation pour les paramètres de calendrier
const calendarParamsSchema = Joi.object({
  year: Joi.number()
    .integer()
    .min(2000)
    .max(new Date().getFullYear() + 1)
    .default(new Date().getFullYear())
    .optional(),
  
  month: Joi.number()
    .integer()
    .min(0)
    .max(11)
    .optional()
});

// Middleware de validation générique
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: {
          message: 'Données de validation invalides',
          details: errors
        }
      });
    }

    // Remplacer les données validées
    req[property] = value;
    next();
  };
};

// Validation spécifique pour les ObjectId MongoDB
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const mongoose = require('mongoose');
    const id = req.params[paramName];

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `ID ${paramName} invalide`
        }
      });
    }

    next();
  };
};

module.exports = {
  photoUploadSchema,
  photoSearchSchema,
  mapParamsSchema,
  calendarParamsSchema,
  validate,
  validateObjectId
};
