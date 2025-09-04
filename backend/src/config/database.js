const mongoose = require('mongoose');
const GridFSBucket = require('mongodb').GridFSBucket;

let gridfsBucket;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/photoapp', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Attendre que la connexion soit complètement établie
    await new Promise((resolve) => {
      if (conn.connection.readyState === 1) {
        resolve();
      } else {
        conn.connection.once('open', resolve);
      }
    });

    // Initialiser GridFS après la connexion
    const db = conn.connection.db;
    gridfsBucket = new GridFSBucket(db, { bucketName: 'photos' });
    
    console.log('✅ GridFS initialisé avec succès');

    return conn;
  } catch (error) {
    console.error('Erreur de connexion à MongoDB:', error);
    process.exit(1);
  }
};

const getGridFSBucket = () => {
  if (!gridfsBucket) {
    throw new Error('GridFS bucket non initialisé. Assurez-vous que la base de données est connectée.');
  }
  return gridfsBucket;
};


module.exports = {
  connectDB,
  getGridFSBucket
};
