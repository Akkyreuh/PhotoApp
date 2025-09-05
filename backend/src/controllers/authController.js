const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { formatResponse, formatError } = require('../utils/helpers');

/**
 * Génère un token JWT pour un utilisateur
 */
const generateToken = (userId) => {
  return jwt.sign(
    { userId, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * Controller pour l'inscription
 */
const register = async (req, res) => {
  try {
    console.log('=== DEBUG INSCRIPTION ===');
    console.log('Données reçues:', req.body);
    
    const { username, email, password, firstName, lastName } = req.body;

    console.log('Vérification utilisateur existant pour email:', email);
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findByEmailOrUsername(email);
    console.log('Utilisateur existant trouvé:', existingUser ? 'OUI' : 'NON');
    
    if (existingUser) {
      console.log('Erreur: Utilisateur déjà existant');
      return res.status(400).json(formatError('Un utilisateur avec cet email ou nom d\'utilisateur existe déjà'));
    }

    console.log('Création du nouvel utilisateur...');
    // Créer le nouvel utilisateur
    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName
    });

    console.log('Sauvegarde en base de données...');
    await user.save();
    console.log('Utilisateur sauvegardé avec succès, ID:', user._id);

    // Générer le token
    const token = generateToken(user._id);

    // Mettre à jour la dernière connexion
    await user.updateLastLogin();

    res.status(201).json(formatResponse(true, {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName
      },
      token
    }, 'Inscription réussie'));

  } catch (error) {
    console.error('=== ERREUR INSCRIPTION DÉTAILLÉE ===');
    console.error('Type d\'erreur:', error.name);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('Code erreur:', error.code);
    console.error('Erreur complète:', error);
    
    // Gestion des erreurs de validation MongoDB
    if (error.name === 'ValidationError') {
      console.error('Erreurs de validation:', error.errors);
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json(formatError(messages.join(', ')));
    }
    
    // Gestion des erreurs de duplication
    if (error.code === 11000) {
      console.error('Erreur de duplication:', error.keyValue);
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json(formatError(`Ce ${field} est déjà utilisé`));
    }

    res.status(500).json(formatError('Erreur lors de l\'inscription'));
  }
};

/**
 * Controller pour la connexion
 */
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json(formatError('Email/nom d\'utilisateur et mot de passe requis'));
    }

    // Trouver l'utilisateur
    const user = await User.findByEmailOrUsername(identifier);
    if (!user) {
      return res.status(401).json(formatError('Identifiants invalides'));
    }

    // Vérifier si le compte est actif
    if (!user.isActive) {
      return res.status(401).json(formatError('Compte désactivé'));
    }

    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json(formatError('Identifiants invalides'));
    }

    // Générer le token
    const token = generateToken(user._id);

    // Mettre à jour la dernière connexion
    await user.updateLastLogin();

    res.json(formatResponse(true, {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        lastLogin: user.lastLogin
      },
      token
    }, 'Connexion réussie'));

  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json(formatError('Erreur lors de la connexion'));
  }
};

/**
 * Controller pour récupérer le profil utilisateur
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json(formatError('Utilisateur non trouvé'));
    }

    res.json(formatResponse(true, {
      id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt
    }));

  } catch (error) {
    console.error('Erreur récupération profil:', error);
    res.status(500).json(formatError('Erreur lors de la récupération du profil'));
  }
};

/**
 * Controller pour mettre à jour le profil
 */
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, username } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json(formatError('Utilisateur non trouvé'));
    }

    // Vérifier si le nouveau nom d'utilisateur est disponible
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json(formatError('Ce nom d\'utilisateur est déjà utilisé'));
      }
      user.username = username;
    }

    // Mettre à jour les autres champs
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;

    await user.save();

    res.json(formatResponse(true, {
      id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName
    }, 'Profil mis à jour avec succès'));

  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json(formatError(messages.join(', ')));
    }

    res.status(500).json(formatError('Erreur lors de la mise à jour du profil'));
  }
};

/**
 * Controller pour changer le mot de passe
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json(formatError('Mot de passe actuel et nouveau mot de passe requis'));
    }

    if (newPassword.length < 6) {
      return res.status(400).json(formatError('Le nouveau mot de passe doit contenir au moins 6 caractères'));
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json(formatError('Utilisateur non trouvé'));
    }

    // Vérifier le mot de passe actuel
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json(formatError('Mot de passe actuel incorrect'));
    }

    // Mettre à jour le mot de passe
    user.password = newPassword;
    await user.save();

    res.json(formatResponse(true, null, 'Mot de passe changé avec succès'));

  } catch (error) {
    console.error('Erreur changement mot de passe:', error);
    res.status(500).json(formatError('Erreur lors du changement de mot de passe'));
  }
};

/**
 * Controller pour la déconnexion (côté client principalement)
 */
const logout = async (req, res) => {
  try {
    // Avec JWT, la déconnexion se fait principalement côté client
    // en supprimant le token du stockage local
    res.json(formatResponse(true, null, 'Déconnexion réussie'));
  } catch (error) {
    console.error('Erreur déconnexion:', error);
    res.status(500).json(formatError('Erreur lors de la déconnexion'));
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  generateToken
};
