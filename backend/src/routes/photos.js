const express = require('express');
const mongoose = require('mongoose');
const { upload, handleUploadError, saveToGridFS } = require('../config/multer');
const { getGridFSBucket } = require('../config/database');
const Photo = require('../models/Photo');
const sharp = require('sharp');
const moment = require('moment');

const router = express.Router();

// @desc    Upload une nouvelle photo
// @route   POST /api/photos/upload
// @access  Public
router.post('/upload', upload.single('photo'), handleUploadError, async (req, res) => {
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
// @access  Public
router.get('/map', async (req, res) => {
  try {
    // Filtres optionnels
    let query = {};
    
    // Filtre par zone géographique (bounding box)
    if (req.query.northEast && req.query.southWest) {
      const ne = req.query.northEast.split(',').map(coord => parseFloat(coord));
      const sw = req.query.southWest.split(',').map(coord => parseFloat(coord));
      
      query['location.latitude'] = { $gte: sw[0], $lte: ne[0] };
      query['location.longitude'] = { $gte: sw[1], $lte: ne[1] };
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
// @access  Public
router.get('/calendar', async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = req.query.month ? parseInt(req.query.month) : null;
    
    // Construction de la requête de date
    let startDate, endDate;
    
    if (month !== null) {
      // Mois spécifique
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 0, 23, 59, 59);
    } else {
      // Année complète
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59);
    }

    const photos = await Photo.find({
      timestamp: {
        $gte: startDate,
        $lte: endDate
      }
    })
    .sort({ timestamp: -1 })
    .select('originalName timestamp location');

    // Grouper les photos par date
    const photosByDate = {};
    
    photos.forEach(photo => {
      const dateKey = moment(photo.timestamp).format('YYYY-MM-DD');
      
      if (!photosByDate[dateKey]) {
        photosByDate[dateKey] = {
          date: dateKey,
          count: 0,
          photos: []
        };
      }
      
      photosByDate[dateKey].count++;
      photosByDate[dateKey].photos.push({
        id: photo._id,
        originalName: photo.originalName,
        timestamp: photo.timestamp,
        thumbnailUrl: `/api/photos/${photo._id}/thumbnail?size=150`
      });
    });

    // Convertir en tableau et trier par date
    const calendarData = Object.values(photosByDate)
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
// @access  Public
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Construction de la requête avec filtres
    let query = {};

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

// @desc    Récupérer une photo spécifique
// @route   GET /api/photos/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'ID de photo invalide' }
      });
    }

    const photo = await Photo.findById(req.params.id).select('-gridfsId');
    
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
// @access  Public
router.get('/:id/download', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'ID de photo invalide' }
      });
    }

    const photo = await Photo.findById(req.params.id);
    
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
// @access  Public
router.get('/:id/thumbnail', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'ID de photo invalide' }
      });
    }

    const photo = await Photo.findById(req.params.id);
    
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
