import Logger from '../Utils/Logger.js';
import mongoose from 'mongoose';

class ErrorHandler {
    constructor() {
        const logger = new Logger();
        this.logger = logger.getLoggerInstance();
    }

    handleError(err, req, res, next) {
        let statusCode = err.statusCode || 500;
        let message = err.message || 'Erreur serveur interne';

        this.logger.error(`Erreur: ${message}`, { stack: err.stack, req });

        // Gestion spécifique des erreurs Mongoose
        if (err instanceof mongoose.Error.CastError) {
            statusCode = 400;
            message = 'ID invalide';
        } else if (err instanceof mongoose.Error.ValidationError) {
            statusCode = 422;
            const errors = Object.values(err.errors).map(el => el.message);
            message = 'Erreur de validation: ' + errors.join(', ');
        } else if (err.code === 11000) {
            statusCode = 409;
            message = 'Erreur de clé dupliquée';
        } else if (err.name === 'UnauthorizedError') {
            statusCode = 401;
            message = 'Non autorisé';
        }

        if (statusCode >= 500) {
             message = 'Erreur serveur, veuillez réessayer plus tard';
        }

        const errorResponse = {
            success: false,
            message,
            error: {
                code: statusCode,
                details: process.env.NODE_ENV === 'development' ? err.stack : undefined
            }
        };

        res.status(statusCode).json(errorResponse);
    }
}

const errorHandler = new ErrorHandler();
export default errorHandler.handleError.bind(errorHandler);
