import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { errors } from 'celebrate';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import responseTime from 'response-time';
import cluster from 'cluster';
import os from 'os';
import Response from "./Utils/errorResponse.js"; // Assuming Response.js was a typo for errorResponse.js and path was wrong
import Logger from "./Utils/Logger.js"; // Corrected Logger import path
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import Database from './Config/database.js';
import apiRoutes from './Routes/index.js';
import errorHandler from './Middlewares/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger le document Swagger
// Assure la déclaration et l'initialisation de swaggerDocument au niveau global.
let swaggerDocument = null;
try {
    const swaggerPath = path.join(__dirname, '..', 'swagger.json'); // Chemin vers swagger.json à la racine du projet
    if (fs.existsSync(swaggerPath)) {
        const swaggerFile = fs.readFileSync(swaggerPath, 'utf8');
        swaggerDocument = JSON.parse(swaggerFile);
    } else {
        console.warn(`[App.js] Fichier Swagger (swagger.json) non trouvé à l'emplacement attendu: ${swaggerPath}`);
    }
} catch (error) {
    console.error('[App.js] Erreur critique lors du chargement ou du parsing du fichier swagger.json:', error);
}

// Initialize Logger instance
const logger = new Logger();

// Chargement des variables d'environnement
dotenv.config();

// Configuration
const PORT = process.env.APP_PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const ENABLE_CLUSTER = process.env.ENABLE_CLUSTER === 'true';

// Class App
class App {
    constructor() {
        this.app = express();
        this.port = PORT;
        this.env = NODE_ENV;
        this.db = new Database();
        this.Configs();
        this.Middlewares();
        this.Routes();
        this.Errors();
    }

    Configs() {
        if (this.env === 'production') {
            this.app.set('trust proxy', 1);
            logger.logger.info('Production mode: Trust proxy activated');
        }

        // Set view engine
        this.app.set('view engine', 'pug');
        this.app.set('views', path.join(__dirname, 'Views'));
        logger.logger.info('Pug view engine configured');

        // Set static folder
        this.app.use(express.static(path.join(__dirname, 'Public')));
        logger.logger.info('Static folder configured');
    }

    Middlewares() {
        // Security
        this.app.use(helmet());
        logger.logger.debug('Helmet security middleware loaded');

        // CORS
        this.app.use(cors(this._getCorsConfig()));
        logger.logger.debug('CORS middleware configured');

        // Logging
        // Ensure the logger and its methods are bound correctly for Morgan.
        // The original { write: (message) => logger.httpLogger.http(message.trim()) } should be correct.
        // The error "stream.write is not a function" is perplexing if logger.httpLogger.http is a valid function.
        // This change explicitly assigns the arrow function to a 'write' property.
        const morganStream = {
            write: (messageString) => {
                if (logger && logger.httpLogger && typeof logger.httpLogger.http === 'function') {
                    logger.httpLogger.http(messageString.trim());
                } else {
                    // This console.error will show up in stdout if there's an issue with the logger setup itself
                    console.error('[App.js] Morgan stream error: logger.httpLogger.http is not available or not a function.');
                    // Optionally, you could fall back to console.log for the message itself
                    // console.log(messageString.trim());
                }
            }
        };
        this.app.use(morgan('combined', { stream: morganStream }));
        this.app.use(logger.expressLogger());
        logger.logger.debug('Logging middlewares loaded');

        // Rate limiting
        this.app.use(rateLimit(this._getRateLimitConfig()));
        logger.logger.debug('Rate limiting middleware loaded');

        // Performance
        this.app.use(compression(this._getCompressionConfig()));
        this.app.use(responseTime());
        logger.logger.debug('Performance middlewares loaded');

        // Body parsing
        this.app.use(express.json(this._getBodyParserConfig()));
        this.app.use(express.urlencoded({ extended: true }));
        logger.logger.debug('Body parser middlewares loaded');

        // Servir les fichiers statiques du répertoire uploads
        this.app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
        logger.logger.debug('Static file serving for /uploads configured');

        // Health check
        this.app.get('/health', (req, res) => this._healthCheck(req, res));
        logger.logger.debug('Health check endpoint configured');
    }

    Routes() {
        // API Routes
        this.app.use('/e-shopping-api/v1', apiRoutes);
        logger.logger.info(' API routes loaded');

        // Documentation API Swagger
        if (this.env !== 'production') {
            if (swaggerDocument) {
                this.app.use('/eshopping-api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
                logger.logger.info(' Swagger API documentation loaded at /eshopping-api-docs');
            } else {
                logger.logger.warn(' Swagger documentation not loaded because swagger.json was not found or was invalid.');
            }
        }

        // Route for API documentation
        this.app.get('/e-shopping-api/v1/doc', (req, res) => {
            res.render('doc', { title: 'eShopping API Documentation' }); // Renders doc.pug
        });
        logger.logger.info(' API documentation route /e-shopping-api/v1/doc configured');

        // 404 Handler
        this.app.use(this._handleNotFound);
    }

    Errors() {
        this.app.use(errors());
        this.app.use(errorHandler);
        logger.logger.debug('Error handling middlewares loaded');

        process.on('unhandledRejection', (reason, promise) => {
            logger.logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
        });

        process.on('uncaughtException', (error) => {
            logger.logger.error(`Uncaught Exception: ${error.message}`, { stack: error.stack });
            if (!ENABLE_CLUSTER) {
                process.exit(1);
            }
        });
    }

    async Launch() {
        try {
            await this.db.connect();
            if (ENABLE_CLUSTER && cluster.isPrimary) {
                this.runCluster();
            } else {
                await this.runServer();
            }
        } catch (error) {
            logger.logger.error('Application startup failed', {
                error: error.message,
                stack: error.stack
            });
            process.exit(1);
        }
    }

    async runServer() {
        const server = this.app.listen(this.port, () => {
            logger.logger.info(` 🚀Server started on port ${this.port}`, {
                environment: this.env,
                pid: process.pid
            });
            this._setupGracefulShutdown(server);
        });
        return server;
    }

    runCluster() {
        const cpuCount = os.cpus().length;
        logger.logger.info(`Starting cluster with ${cpuCount} workers`);

        for (let i = 0; i < cpuCount; i++) {
            cluster.fork().on('error', (error) => {
                logger.error(`Cluster fork failed: ${error.message}`, { stack: error.stack });
            });
        }

        cluster.on('exit', (worker) => {
            logger.warn(`Worker ${worker.process.pid} died`, {
                pid: worker.process.pid,
                date: new Date()
            });
            cluster.fork();
        });
    }

    _setupGracefulShutdown(server) {
        const shutdownSignals = ['SIGTERM', 'SIGINT', 'SIGQUIT'];
        const shutdownTimeout = 30000; // 30 seconds

        shutdownSignals.forEach(signal => {
            process.on(signal, async () => {
                logger.logger.info(`Received ${signal}, shutting down gracefully...`);

                const timeout = setTimeout(() => {
                    logger.logger.error('Shutdown timeout exceeded, forcing exit');
                    process.exit(1);
                }, shutdownTimeout);

                try {
                    await new Promise((resolve, reject) => {
                        server.close((err) => (err ? reject(err) : resolve()));
                    });
                    await this.db.disconnect();
                    logger.logger.info('Server successfully shutdown');
                    clearTimeout(timeout);
                    process.exit(0);
                } catch (error) {
                    logger.logger.error('Error during shutdown', {
                        error: error.message,
                        stack: error.stack
                    });
                    clearTimeout(timeout);
                    process.exit(1);
                }
            });
        });
    }

    _getCorsConfig() {
        const origins = this.env === 'development' 
            ? '*' 
            : (process.env.ALLOWED_ORIGINS?.split(',').filter(Boolean) || []);
        if (this.env === 'production' && !origins.length) {
            logger.logger.warn('No ALLOWED_ORIGINS specified in production');
        }
        return {
            origin: origins,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            credentials: true
        };
    }

    _getRateLimitConfig() {
        return {
            windowMs: 15 * 60 * 1000,
            max: this.env === 'development' ? 1000 : 200,
            message: 'Too many requests from this IP, please try again later',
            skip: (req) => ['::1', '127.0.0.1'].includes(req.ip)
        };
    }

    _getCompressionConfig() {
        return {
            level: 6,
            threshold: 10240, // 10kb in bytes
            filter: (req, res) => {
                if (req.headers['x-no-compression']) return false;
                return compression.filter(req, res);
            }
        };
    }

    _getBodyParserConfig() {
        return {
            limit: '10mb',
            verify: (req, res, buf) => {
                req.rawBody = buf.toString();
            }
        };
    }

    async _healthCheck(req, res) {
        let dbStatus = 'UP';
        try {
            await this.db.ping(); // Assuming Database class has a ping method
        } catch (error) {
            dbStatus = 'DOWN';
            logger.logger.error('Database health check failed', { error: error.message });
        }

        const health = {
            status: dbStatus === 'UP' ? 'UP' : 'DEGRADED',
            timestamp: new Date().toISOString(),
            environment: this.env,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            database: dbStatus
        };

        logger.logger.debug('Health check performed', { health });
        res.status(200).json(health);
    }

    _handleNotFound(req, res) {
        const errorInfo = {
            path: req.originalUrl,
            method: req.method,
            ip: req.ip,
            timestamp: new Date().toISOString()
        };

        logger.logger.warn('404 Not Found', errorInfo);
        res.status(404).json({
            success: false,
            error: {
                code: 404,
                message: 'Resource not found',
                ...errorInfo
            }
        });
    }
}

export default App;