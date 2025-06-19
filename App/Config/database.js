import mongoose from 'mongoose';
import Logger from '../Utils/Logger.js';
import { EventEmitter } from 'events';

class Database extends EventEmitter {
  constructor(logger) {
    super();
    this.logger = logger || new Logger();
    this.db = mongoose.connection;

    // Configuration globale de Mongoose
    mongoose.set('strictQuery', true);
    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', (collection, method, query, doc) => {
        this.logger.logger.debug(`Mongoose: ${collection}.${method}`, { query, doc });
      });
    }

    // Gestionnaires d'événements de connexion
    this.db.on('error', (error) => {
      this.logger.logger.error('Erreur de connexion à MongoDB', { error: error.message, stack: error.stack });
      this.emit('error', error); // Emit the error event
    });

    this.db.once('open', () => {
      this.logger.logger.info('Connecté à MongoDB', {
        database: this.db.name,
        host: this.db.host,
        port: this.db.port,
      });
      this.emit('connect');
    });

    this.db.on('disconnected', () => {
      this.logger.logger.warn('MongoDB déconnecté');
      this.emit('disconnect');
    });

    this.db.on('reconnected', () => {
      this.logger.logger.info('MongoDB reconnecté');
      this.emit('reconnect');
    });

    this.db.on('close', () => {
      this.logger.logger.info('Connexion à MongoDB fermée');
      this.emit('close');
    });
  }

  async connect(options = {}, retryCount = 0) {
    if (!process.env.DB_URL) {
      const error = new Error('La variable d\'environnement DB_URL n\'est pas définie');
      this.logger.logger.error('Erreur de configuration de la base de données', { error: error.message });
      this.emit('error', error);
      throw error;
    }

    const connectionOptions = {
      serverSelectionTimeoutMS: options.serverSelectionTimeoutMS || 5000,
      maxPoolSize: options.maxPoolSize || 10,
      minPoolSize: options.minPoolSize || 2,
      connectTimeoutMS: options.connectTimeoutMS || 10000,
      socketTimeoutMS: options.socketTimeoutMS || 45000,
      family: options.family || 4,
      autoIndex: options.autoIndex !== undefined ? options.autoIndex : true, // Add autoIndex option
      // If you are connecting to a replica set, you can add the replicaSet option here
      // replicaSet: options.replicaSet,
    };

    try {
      await mongoose.connect(process.env.DB_URL, connectionOptions);
    } catch (error) {
      this.logger.logger.error('Erreur de connexion à MongoDB', {
        error: error.message,
        stack: error.stack,
      });
      const maxRetries = options.maxRetries || 5; // Allow maxRetries to be configured
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Backoff exponentiel
        this.logger.logger.warn(`Tentative de reconnexion dans ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        await this.connect(options, retryCount + 1); // Appel récursif avec incrémentation du compteur
      } else {
        const fatalError = new Error('Échec de la connexion à MongoDB après plusieurs tentatives');
        this.emit('error', fatalError); // Emit a fatal error
        throw fatalError;
      }
    }
  }

  async disconnect() {
    try {
      await mongoose.disconnect();
      this.logger.logger.info('MongoDB déconnecté avec succès');
      this.emit('disconnect');
    } catch (error) {
      this.logger.logger.error('Erreur lors de la déconnexion de MongoDB', {
        error: error.message,
        stack: error.stack,
      });
      this.emit('error', error);
      throw error;
    }
  }

  async ping() {
    try {
      await this.db.db.command({ ping: 1 });
      this.logger.logger.debug('MongoDB ping réussi');
      return true;
    } catch (error) {
      this.logger.logger.error('MongoDB ping échoué', {
        error: error.message,
        stack: error.stack,
      });
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Méthode pour initialiser la connexion à la base de données.
   * @param {object} [options] - Options de connexion facultatives.
   * @returns {Promise<void>}
   */
  async init(options = {}) {
    await this.connect(options);
  }

  /**
   * Méthode pour nettoyer et fermer la connexion à la base de données.
   * Doit être appelée lors de l'arrêt de l'application.
   * @returns {Promise<void>}
   */
  async close() {
    await this.disconnect();
  }
}

// Ajouter un gestionnaire de signal pour assurer une déconnexion propre
process.on('SIGINT', async () => {
  const dbInstance = new Database(); // Create a new instance
  dbInstance.logger.logger.info('Signal SIGINT reçu, déconnexion de MongoDB...');
  try {
    await dbInstance.close();
    process.exit(0);
  } catch (error) {
    dbInstance.logger.logger.error('Erreur lors de la déconnexion', { error: error.message });
    process.exit(1);
  }
});

export default Database;
