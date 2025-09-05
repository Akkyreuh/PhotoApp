const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getProfile, 
  updateProfile, 
  changePassword, 
  logout 
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Middleware de validation des erreurs
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Erreurs de validation',
      errors: errors.array()
    });
  }
  next();
};

/**
 * POST /api/auth/register
 * Inscription d'un nouvel utilisateur
 */
router.post('/register', [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Le nom d\'utilisateur doit contenir entre 3 et 30 caractères')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Le prénom est requis et doit contenir moins de 50 caractères'),
  
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Le nom est requis et doit contenir moins de 50 caractères'),
  
  handleValidationErrors
], register);

/**
 * POST /api/auth/login
 * Connexion d'un utilisateur
 */
router.post('/login', [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Email ou nom d\'utilisateur requis'),
  
  body('password')
    .notEmpty()
    .withMessage('Mot de passe requis'),
  
  handleValidationErrors
], login);

/**
 * GET /api/auth/profile
 * Récupération du profil utilisateur (authentification requise)
 */
router.get('/profile', authenticateToken, getProfile);

/**
 * PUT /api/auth/profile
 * Mise à jour du profil utilisateur (authentification requise)
 */
router.put('/profile', [
  authenticateToken,
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Le prénom doit contenir moins de 50 caractères'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Le nom doit contenir moins de 50 caractères'),
  
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Le nom d\'utilisateur doit contenir entre 3 et 30 caractères')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores'),
  
  handleValidationErrors
], updateProfile);

/**
 * PUT /api/auth/change-password
 * Changement de mot de passe (authentification requise)
 */
router.put('/change-password', [
  authenticateToken,
  body('currentPassword')
    .notEmpty()
    .withMessage('Mot de passe actuel requis'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères'),
  
  handleValidationErrors
], changePassword);

/**
 * POST /api/auth/logout
 * Déconnexion (authentification requise)
 */
router.post('/logout', authenticateToken, logout);

module.exports = router;
