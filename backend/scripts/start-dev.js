#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Démarrage du serveur de développement PhotoApp Backend...\n');

// Vérifier si MongoDB est en cours d'exécution
const checkMongoDB = () => {
  return new Promise((resolve) => {
    const mongoose = require('mongoose');
    
    mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/photoapp', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 3000
    })
    .then(() => {
      console.log('✅ MongoDB est accessible');
      mongoose.connection.close();
      resolve(true);
    })
    .catch(() => {
      console.log('❌ MongoDB n\'est pas accessible');
      console.log('💡 Assurez-vous que MongoDB est démarré sur votre système');
      resolve(false);
    });
  });
};

// Fonction principale
const startDev = async () => {
  // Charger les variables d'environnement
  require('dotenv').config();
  
  console.log('🔍 Vérification de MongoDB...');
  const mongoAvailable = await checkMongoDB();
  
  if (!mongoAvailable) {
    console.log('\n📋 Instructions pour démarrer MongoDB:');
    console.log('   • Windows: net start MongoDB');
    console.log('   • macOS: brew services start mongodb-community');
    console.log('   • Linux: sudo systemctl start mongod');
    console.log('\n⚠️  Le serveur va démarrer mais les fonctionnalités nécessitant la base de données ne fonctionneront pas.\n');
  }
  
  console.log('🔧 Démarrage du serveur en mode développement...\n');
  
  // Démarrer le serveur avec Node.js --watch (Node 18+)
  const serverProcess = spawn('node', ['--watch', 'src/server.js'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true
  });
  
  serverProcess.on('error', (error) => {
    console.error('❌ Erreur lors du démarrage:', error);
    console.log('💡 Si --watch n\'est pas supporté, utilisez: npm start');
  });
  
  serverProcess.on('close', (code) => {
    console.log(`\n🛑 Serveur arrêté avec le code ${code}`);
  });
  
  // Gestion propre de l'arrêt
  process.on('SIGINT', () => {
    console.log('\n🛑 Arrêt du serveur...');
    serverProcess.kill();
    process.exit(0);
  });
};

startDev().catch(console.error);
