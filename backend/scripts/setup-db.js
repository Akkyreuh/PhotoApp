#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

const setupDatabase = async () => {
  try {
    console.log('🔧 Configuration de la base de données PhotoApp...\n');
    
    // Connexion à MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/photoapp';
    console.log(`📡 Connexion à: ${mongoUri}`);
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connexion à MongoDB réussie');
    
    // Créer les index pour optimiser les performances
    const Photo = require('../src/models/Photo');
    
    console.log('📊 Création des index...');
    
    // Index géospatial pour les recherches par localisation
    await Photo.collection.createIndex({ 
      'location.latitude': 1, 
      'location.longitude': 1 
    });
    console.log('  ✓ Index géospatial créé');
    
    // Index pour les recherches par date
    await Photo.collection.createIndex({ timestamp: -1 });
    console.log('  ✓ Index timestamp créé');
    
    // Index pour les recherches par date d\'upload
    await Photo.collection.createIndex({ uploadDate: -1 });
    console.log('  ✓ Index uploadDate créé');
    
    // Index pour les tags
    await Photo.collection.createIndex({ tags: 1 });
    console.log('  ✓ Index tags créé');
    
    // Index composé pour les requêtes complexes
    await Photo.collection.createIndex({ 
      timestamp: -1, 
      'location.latitude': 1, 
      'location.longitude': 1 
    });
    console.log('  ✓ Index composé créé');
    
    // Vérifier les collections GridFS
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    const hasPhotosFS = collections.some(col => col.name === 'photos.files');
    const hasPhotosChunks = collections.some(col => col.name === 'photos.chunks');
    
    if (!hasPhotosFS || !hasPhotosChunks) {
      console.log('📁 Initialisation des collections GridFS...');
      
      // Créer les collections GridFS si elles n'existent pas
      await db.createCollection('photos.files');
      await db.createCollection('photos.chunks');
      
      console.log('  ✓ Collections GridFS créées');
    } else {
      console.log('  ✓ Collections GridFS déjà présentes');
    }
    
    // Statistiques de la base
    const stats = await db.stats();
    console.log(`\n📈 Statistiques de la base de données:`);
    console.log(`  • Nom: ${stats.db}`);
    console.log(`  • Collections: ${stats.collections}`);
    console.log(`  • Taille: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    
    console.log('\n🎉 Configuration de la base de données terminée avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('📴 Connexion fermée');
  }
};

// Exécuter le script
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;
