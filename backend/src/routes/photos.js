const express = require('express');
const mongoose = require('mongoose');
const { upload, handleUploadError, saveToGridFS } = require('../config/multer');
const { getGridFSBucket } = require('../config/database');
const Photo = require('../models/Photo');
const sharp = require('sharp');
const moment = require('moment');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @desc    Upload une nouvelle photo
// @route   POST /api/photos/upload
// @access  Private
router.post('/upload', authenticateToken, upload.single('photo'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'Aucun fichier fourni' }
      });
    }

    // Validation des données requises
    const { latitude, longitude, timestamp } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: { message: 'Coordonnées GPS requises (latitude, longitude)' }
      });
    }

    if (!timestamp) {
      return res.status(400).json({
        success: false,
        error: { message: 'Timestamp requis' }
      });
    }

    // Sauvegarder le fichier dans GridFS
    const gridfsFile = await saveToGridFS(req.file.buffer, req.file.originalname, req.file.mimetype);

    // Créer l'enregistrement photo en base
    const photoData = {
      filename: gridfsFile.filename,
      originalName: gridfsFile.originalname,
      mimeType: gridfsFile.mimetype,
      size: gridfsFile.size,
      gridfsId: gridfsFile.id,
      userId: req.user.userId, // Associer à l'utilisateur authentifié
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: req.body.address || null
      },
      timestamp: new Date(timestamp),
      tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : []
    };

    const photo = new Photo(photoData);
    await photo.save();

    res.status(201).json({
      success: true,
      data: {
        id: photo._id,
        filename: photo.filename,
        originalName: photo.originalName,
        location: photo.location,
        timestamp: photo.timestamp,
        downloadUrl: photo.downloadUrl,
        thumbnailUrl: photo.thumbnailUrl
      }
    });

  } catch (error) {
    console.error('Erreur upload photo:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur lors de l\'upload de la photo' }
    });
  }
});

// @desc    Récupérer les photos pour la carte
// @route   GET /api/photos/map
// @access  Private
router.get('/map', authenticateToken, async (req, res) => {
  try {
    // Récupérer les paramètres de requête
    const { sw, ne } = req.query; // southwest et northeast bounds
    
    // Construction de la requête - filtrer par utilisateur authentifié
    let query = { userId: req.user.userId };
    
    // Filtre par zone géographique si fournie
    if (sw && ne) {
      const southwest = sw.split(',').map(parseFloat);
      const northeast = ne.split(',').map(parseFloat);
      
      query['location.latitude'] = { $gte: southwest[0], $lte: northeast[0] };
      query['location.longitude'] = { $gte: southwest[1], $lte: northeast[1] };
    }
    
    // Filtre par période
    if (req.query.startDate || req.query.endDate) {
      query.timestamp = {};
      if (req.query.startDate) {
        query.timestamp.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.timestamp.$lte = new Date(req.query.endDate);
      }
    }

    const photos = await Photo.find(query)
      .sort({ timestamp: -1 })
      .limit(100) // Limiter pour les performances
      .select('originalName location timestamp');

    // Formater les données pour la carte
    const mapData = photos.map(photo => ({
      id: photo._id,
      latitude: photo.location.latitude,
      longitude: photo.location.longitude,
      title: photo.originalName,
      timestamp: photo.timestamp,
      thumbnailUrl: `/api/photos/${photo._id}/thumbnail?size=100`
    }));

    res.json({
      success: true,
      data: mapData,
      count: mapData.length
    });

  } catch (error) {
    console.error('Erreur récupération données carte:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur lors de la récupération des données pour la carte' }
    });
  }
});

// @desc    Récupérer les photos pour le calendrier
// @route   GET /api/photos/calendar
// Récupérer les données pour le calendrier
router.get('/calendar', authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.query;
    
    // Construire les dates de début et fin
    let startDate, endDate;
    
    if (year && month !== undefined) {
      // Mois spécifique
      startDate = new Date(parseInt(year), parseInt(month), 1);
      endDate = new Date(parseInt(year), parseInt(month) + 1, 0, 23, 59, 59);
    } else if (year) {
      // Année entière
      startDate = new Date(parseInt(year), 0, 1);
      endDate = new Date(parseInt(year), 11, 31, 23, 59, 59);
    } else {
      // Par défaut, mois actuel
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    let query = {
      userId: req.user.userId,
      timestamp: {
        $gte: startDate,
        $lte: endDate
      }
    };

    const photos = await Photo.find(query)
    .select('timestamp originalName thumbnailUrl')
    .sort({ timestamp: -1 });

    // Grouper les photos par date
    const photosByDate = {};
    photos.forEach(photo => {
      const dateKey = photo.timestamp.toISOString().split('T')[0];
      if (!photosByDate[dateKey]) {
        photosByDate[dateKey] = [];
      }
      photosByDate[dateKey].push({
        id: photo._id,
        originalName: photo.originalName,
        thumbnailUrl: photo.thumbnailUrl,
        timestamp: photo.timestamp
      });
    });

    // Convertir en format attendu par le calendrier
    const calendarData = Object.keys(photosByDate)
      .map(date => ({
        date,
        photos: photosByDate[date],
        count: photosByDate[date].length
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      data: calendarData,
      period: {
        year,
        month: month !== null ? month : null,
        startDate,
        endDate
      },
      totalPhotos: photos.length
    });

  } catch (error) {
    console.error('Erreur récupération données calendrier:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur lors de la récupération des données pour le calendrier' }
    });
  }
});
// Note: route /api/photos/stats supprimée car non utilisée par l'application

// @desc    Récupérer toutes les photos avec filtres
// @route   GET /api/photos
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Construction de la requête avec filtres - filtrer par utilisateur authentifié
    let query = { userId: req.user.userId };

    // Filtre par date
    if (req.query.startDate || req.query.endDate) {
      query.timestamp = {};
      if (req.query.startDate) {
        query.timestamp.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.timestamp.$lte = new Date(req.query.endDate);
      }
    }

    // Filtre par tags
    if (req.query.tags) {
      const tags = req.query.tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tags };
    }

    // Filtre par proximité géographique
    if (req.query.latitude && req.query.longitude) {
      const lat = parseFloat(req.query.latitude);
      const lng = parseFloat(req.query.longitude);
      const maxDistance = parseFloat(req.query.maxDistance) || 1000; // 1km par défaut

      query['location.latitude'] = {
        $gte: lat - (maxDistance / 111320),
        $lte: lat + (maxDistance / 111320)
      };
      query['location.longitude'] = {
        $gte: lng - (maxDistance / (111320 * Math.cos(lat * Math.PI / 180))),
        $lte: lng + (maxDistance / (111320 * Math.cos(lat * Math.PI / 180)))
      };
    }

    const photos = await Photo.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
      .select('-gridfsId');

    const total = await Photo.countDocuments(query);

    res.json({
      success: true,
      data: photos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Erreur récupération photos:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur lors de la récupération des photos' }
    });
  }
});

// @desc    Récupérer toutes les photos avec pagination
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Si utilisateur connecté, filtrer par ses photos, sinon toutes les photos
    const filter = req.user ? { userId: req.user.userId } : {};
    
    const photos = await Photo.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Photo.countDocuments(filter);

    res.json({
      success: true,
      data: photos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur récupération photos:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur lors de la récupération des photos' }
    });
  }
});

// @desc    Récupérer une photo spécifique
// @route   GET /api/photos/:id
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'ID de photo invalide' }
      });
    }

    const photo = await Photo.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId 
    }).select('-gridfsId');
    
    if (!photo) {
      return res.status(404).json({
        success: false,
        error: { message: 'Photo non trouvée' }
      });
    }

    res.json({
      success: true,
      data: photo
    });

  } catch (error) {
    console.error('Erreur récupération photo:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur lors de la récupération de la photo' }
    });
  }
});

// @desc    Télécharger le fichier photo original
// @route   GET /api/photos/:id/download
// @access  Private
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'ID de photo invalide' }
      });
    }

    const photo = await Photo.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId 
    });
    
    if (!photo) {
      return res.status(404).json({
        success: false,
        error: { message: 'Photo non trouvée' }
      });
    }

    const bucket = getGridFSBucket();
    const downloadStream = bucket.openDownloadStream(photo.gridfsId);

    downloadStream.on('error', (error) => {
      console.error('Erreur téléchargement:', error);
      res.status(404).json({
        success: false,
        error: { message: 'Fichier non trouvé' }
      });
    });

    res.set({
      'Content-Type': photo.mimeType,
      'Content-Disposition': `inline; filename="${photo.originalName}"`
    });

    downloadStream.pipe(res);

  } catch (error) {
    console.error('Erreur téléchargement photo:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur lors du téléchargement' }
    });
  }
});

// @desc    Télécharger une miniature de la photo
// @route   GET /api/photos/:id/thumbnail
// @access  Private
router.get('/:id/thumbnail', authenticateToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'ID de photo invalide' }
      });
    }

    const photo = await Photo.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId 
    });
    
    if (!photo) {
      return res.status(404).json({
        success: false,
        error: { message: 'Photo non trouvée' }
      });
    }

    const bucket = getGridFSBucket();
    const downloadStream = bucket.openDownloadStream(photo.gridfsId);
    
    const size = parseInt(req.query.size) || 200;
    
    downloadStream.on('error', (error) => {
      console.error('Erreur téléchargement miniature:', error);
      res.status(404).json({
        success: false,
        error: { message: 'Fichier non trouvé' }
      });
    });

    res.set({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000'
    });

    // Redimensionner l'image avec Sharp
    const transformer = sharp()
      .resize(size, size, { 
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 });

    downloadStream.pipe(transformer).pipe(res);

  } catch (error) {
    console.error('Erreur génération miniature:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur lors de la génération de la miniature' }
    });
  }
});
// Note: route dynamique '/:type' supprimée pour éviter les collisions avec '/:id' et garder des endpoints explicites

module.exports = router;
