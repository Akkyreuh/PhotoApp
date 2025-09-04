// Script pour examiner les photos stockées dans MongoDB
require('dotenv').config();
const mongoose = require('mongoose');
const { MongoClient, GridFSBucket } = require('mongodb');
const Photo = require('../src/models/Photo');

async function checkPhotos() {
  try {
    // Connexion à MongoDB
    console.log('Connexion à MongoDB...');
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/photoapp';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connecté à MongoDB');

    // 1. Vérifier les documents Photo
    console.log('\n=== DOCUMENTS PHOTO ===');
    const photos = await Photo.find().sort({ timestamp: -1 }).limit(5);
    console.log(`Nombre total de photos: ${await Photo.countDocuments()}`);
    
    if (photos.length > 0) {
      console.log('\nExemple de document Photo:');
      console.log(JSON.stringify(photos[0], null, 2));
      
      console.log('\nListe des 5 dernières photos:');
      photos.forEach((photo, index) => {
        console.log(`\n[${index + 1}] Photo ID: ${photo._id}`);
        console.log(`  - Nom original: ${photo.originalName}`);
        console.log(`  - Timestamp: ${photo.timestamp}`);
        console.log(`  - Localisation: ${photo.location.latitude}, ${photo.location.longitude}`);
        console.log(`  - Fichier: ${photo.filename}`);
      });
    } else {
      console.log('Aucune photo trouvée dans la collection Photo');
    }

    // 2. Vérifier les fichiers GridFS
    console.log('\n=== FICHIERS GRIDFS ===');
    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: 'photos' });
    
    const cursor = bucket.find({}).sort({ uploadDate: -1 }).limit(5);
    const files = await cursor.toArray();
    
    if (files.length > 0) {
      console.log(`Nombre total de fichiers GridFS: ${files.length}`);
      console.log('\nExemple de fichier GridFS:');
      console.log(JSON.stringify(files[0], null, 2));
      
      console.log('\nListe des 5 derniers fichiers GridFS:');
      files.forEach((file, index) => {
        console.log(`\n[${index + 1}] Fichier ID: ${file._id}`);
        console.log(`  - Nom: ${file.filename}`);
        console.log(`  - Date d'upload: ${file.uploadDate}`);
        console.log(`  - Taille: ${file.length} octets`);
        console.log(`  - Type: ${file.metadata?.mimeType || 'Non spécifié'}`);
      });
    } else {
      console.log('Aucun fichier trouvé dans GridFS');
    }

    // 3. Vérifier la correspondance entre les documents Photo et les fichiers GridFS
    console.log('\n=== VÉRIFICATION DE CORRESPONDANCE ===');
    if (photos.length > 0 && files.length > 0) {
      const photoFilenames = photos.map(p => p.filename);
      const gridfsFilenames = files.map(f => f.filename);
      
      console.log('Photos sans fichier GridFS correspondant:');
      const missingFiles = photoFilenames.filter(name => !gridfsFilenames.includes(name));
      if (missingFiles.length > 0) {
        missingFiles.forEach(name => console.log(`  - ${name}`));
      } else {
        console.log('  Aucune');
      }
      
      console.log('\nFichiers GridFS sans document Photo correspondant:');
      const orphanFiles = gridfsFilenames.filter(name => !photoFilenames.includes(name));
      if (orphanFiles.length > 0) {
        orphanFiles.forEach(name => console.log(`  - ${name}`));
      } else {
        console.log('  Aucun');
      }
    }

  } catch (error) {
    console.error('Erreur lors de la vérification des photos:', error);
  } finally {
    // Fermer la connexion
    await mongoose.connection.close();
    console.log('\nConnexion MongoDB fermée');
  }
}

// Exécuter la fonction
checkPhotos();
