const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { formatError } = require('../utils/helpers');

/**
 * Middleware d'authentification JWT
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json(formatError('Token d\'accès requis'));
    }

    // Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Vérifier que l'utilisateur existe toujours
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json(formatError('Utilisateur non trouvé'));
    }

    // Vérifier que le compte est toujours actif
    if (!user.isActive) {
      return res.status(401).json(formatError('Compte désactivé'));
    }

    // Ajouter les informations utilisateur à la requête
    req.user = {
      userId: decoded.userId,
      username: user.username,
      email: user.email
    };

    next();
  } catch (error) {
    console.error('Erreur authentification:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json(formatError('Token invalide'));
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json(formatError('Token expiré'));
    }

    return res.status(500).json(formatError('Erreur lors de l\'authentification'));
  }
};

/**
 * Middleware optionnel d'authentification
 * N'échoue pas si pas de token, mais ajoute les infos utilisateur si disponible
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (user && user.isActive) {
      req.user = {
        userId: decoded.userId,
        username: user.username,
        email: user.email
      };
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // En cas d'erreur, continuer sans authentification
    req.user = null;
    next();
  }
};

/**
 * Middleware pour vérifier que l'utilisateur est propriétaire d'une ressource
 */
const requireOwnership = (resourceModel, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam];
      const userId = req.user.userId;

      const resource = await resourceModel.findById(resourceId);
      if (!resource) {
        return res.status(404).json(formatError('Ressource non trouvée'));
      }

      // Vérifier la propriété (adapter selon le modèle)
      if (resource.userId && resource.userId.toString() !== userId) {
        return res.status(403).json(formatError('Accès non autorisé à cette ressource'));
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('Erreur vérification propriété:', error);
      res.status(500).json(formatError('Erreur lors de la vérification des permissions'));
    }
  };
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireOwnership
};
