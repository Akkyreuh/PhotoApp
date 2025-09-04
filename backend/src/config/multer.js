const multer = require('multer');
const mongoose = require('mongoose');
const path = require('path');
const crypto = require('crypto');

// Configuration du stockage en mémoire (nous gérerons GridFS manuellement)
const storage = multer.memoryStorage();

// Filtre pour les types de fichiers acceptés
const fileFilter = (req, file, cb) => {
  // Types MIME acceptés pour les images
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non supporté. Formats acceptés: JPEG, PNG, GIF, WebP'), false);
  }
};

// Configuration de Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 10 * 1024 * 1024, // 10MB par défaut
    files: 1 // Une seule photo à la fois
  }
});

// Fonction pour sauvegarder un fichier dans GridFS
const saveToGridFS = (buffer, originalName, mimeType) => {
  return new Promise((resolve, reject) => {
    const { getGridFSBucket } = require('./database');
    
    try {
      const bucket = getGridFSBucket();
      const filename = crypto.randomBytes(16).toString('hex') + path.extname(originalName);
      
      const uploadStream = bucket.openUploadStream(filename, {
        metadata: {
          originalName: originalName,
          uploadDate: new Date(),
          mimeType: mimeType
        }
      });

      uploadStream.on('error', (error) => {
        reject(error);
      });

      uploadStream.on('finish', () => {
        resolve({
          id: uploadStream.id,
          filename: filename,
          originalname: originalName,
          mimetype: mimeType,
          size: buffer.length
        });
      });

      uploadStream.end(buffer);
    } catch (error) {
      reject(error);
    }
  });
};

// Middleware pour gérer les erreurs d'upload
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Fichier trop volumineux. Taille maximale: 10MB'
        }
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Trop de fichiers. Une seule photo autorisée par upload'
        }
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Champ de fichier inattendu'
        }
      });
    }
  }
  
  if (error.message.includes('Type de fichier non supporté')) {
    return res.status(400).json({
      success: false,
      error: {
        message: error.message
      }
    });
  }

  next(error);
};

module.exports = {
  upload,
  handleUploadError,
  saveToGridFS
};
