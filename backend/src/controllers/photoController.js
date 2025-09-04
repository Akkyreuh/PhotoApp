const Photo = require('../models/Photo');
const { getGridFSBucket } = require('../config/database');
const { formatResponse, formatError, createPagination, cleanTags } = require('../utils/helpers');
const sharp = require('sharp');
const moment = require('moment');

/**
 * Controller pour l'upload de photos
 */
const uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(formatError('Aucun fichier fourni'));
    }

    const { latitude, longitude, timestamp, address, tags } = req.body;

    // Créer l'enregistrement photo
    const photoData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      gridfsId: req.file.id,
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: address || null
      },
      timestamp: new Date(timestamp),
      tags: cleanTags(tags)
    };

    const photo = new Photo(photoData);
    await photo.save();

    res.status(201).json(formatResponse(true, {
      id: photo._id,
      filename: photo.filename,
      originalName: photo.originalName,
      location: photo.location,
      timestamp: photo.timestamp,
      downloadUrl: photo.downloadUrl,
      thumbnailUrl: photo.thumbnailUrl
    }, 'Photo uploadée avec succès'));

  } catch (error) {
    console.error('Erreur upload photo:', error);
    res.status(500).json(formatError('Erreur lors de l\'upload de la photo'));
  }
};

/**
 * Controller pour récupérer les photos avec filtres
 */
const getPhotos = async (req, res) => {
  try {
    const { page, limit, startDate, endDate, tags, latitude, longitude, maxDistance } = req.query;
    
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    // Construction de la requête
    let query = {};

    // Filtre par date
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // Filtre par tags
    if (tags) {
      const tagArray = cleanTags(tags);
      if (tagArray.length > 0) {
        query.tags = { $in: tagArray };
      }
    }

    // Filtre par proximité
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const distance = parseFloat(maxDistance) || 1000;

      query['location.latitude'] = {
        $gte: lat - (distance / 111320),
        $lte: lat + (distance / 111320)
      };
      query['location.longitude'] = {
        $gte: lng - (distance / (111320 * Math.cos(lat * Math.PI / 180))),
        $lte: lng + (distance / (111320 * Math.cos(lat * Math.PI / 180)))
      };
    }

    const photos = await Photo.find(query)
      .sort({ timestamp: -1 })
      .limit(limitNum)
      .skip(skip)
      .select('-gridfsId');

    const total = await Photo.countDocuments(query);
    const pagination = createPagination(pageNum, limitNum, total);

    res.json(formatResponse(true, photos, null, { pagination }));

  } catch (error) {
    console.error('Erreur récupération photos:', error);
    res.status(500).json(formatError('Erreur lors de la récupération des photos'));
  }
};

/**
 * Controller pour récupérer une photo spécifique
 */
const getPhoto = async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id).select('-gridfsId');
    
    if (!photo) {
      return res.status(404).json(formatError('Photo non trouvée'));
    }

    res.json(formatResponse(true, photo));

  } catch (error) {
    console.error('Erreur récupération photo:', error);
    res.status(500).json(formatError('Erreur lors de la récupération de la photo'));
  }
};

/**
 * Controller pour télécharger une photo
 */
const downloadPhoto = async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);
    
    if (!photo) {
      return res.status(404).json(formatError('Photo non trouvée'));
    }

    const bucket = getGridFSBucket();
    const downloadStream = bucket.openDownloadStream(photo.gridfsId);

    downloadStream.on('error', () => {
      res.status(404).json(formatError('Fichier non trouvé'));
    });

    res.set({
      'Content-Type': photo.mimeType,
      'Content-Disposition': `inline; filename="${photo.originalName}"`
    });

    downloadStream.pipe(res);

  } catch (error) {
    console.error('Erreur téléchargement photo:', error);
    res.status(500).json(formatError('Erreur lors du téléchargement'));
  }
};

/**
 * Controller pour générer une miniature
 */
const getThumbnail = async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);
    
    if (!photo) {
      return res.status(404).json(formatError('Photo non trouvée'));
    }

    const bucket = getGridFSBucket();
    const downloadStream = bucket.openDownloadStream(photo.gridfsId);
    const size = parseInt(req.query.size) || 200;

    downloadStream.on('error', () => {
      res.status(404).json(formatError('Fichier non trouvé'));
    });

    res.set({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000'
    });

    const transformer = sharp()
      .resize(size, size, { 
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 });

    downloadStream.pipe(transformer).pipe(res);

  } catch (error) {
    console.error('Erreur génération miniature:', error);
    res.status(500).json(formatError('Erreur lors de la génération de la miniature'));
  }
};

/**
 * Controller pour supprimer une photo
 */
const deletePhoto = async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);
    
    if (!photo) {
      return res.status(404).json(formatError('Photo non trouvée'));
    }

    // Supprimer le fichier de GridFS
    const bucket = getGridFSBucket();
    await bucket.delete(photo.gridfsId);

    // Supprimer l'enregistrement
    await Photo.findByIdAndDelete(req.params.id);

    res.json(formatResponse(true, null, 'Photo supprimée avec succès'));

  } catch (error) {
    console.error('Erreur suppression photo:', error);
    res.status(500).json(formatError('Erreur lors de la suppression'));
  }
};

module.exports = {
  uploadPhoto,
  getPhotos,
  getPhoto,
  downloadPhoto,
  getThumbnail,
  deletePhoto
};
