import userModel from "../Models/user.js";
import ErrorResponse from "../Utils/errorResponse.js";
import APIFeatures from "../Utils/apiFeatures.js";
import Logger from "../Utils/Logger.js";
import Joi from 'joi';

class User {
    constructor() {
        this.model = userModel;
        this.logger = new Logger();
    }

    // Schéma de validation pour la pagination et la recherche
    querySchema = Joi.object({
        page: Joi.number().integer().min(1),
        limit: Joi.number().integer().min(1),
        search: Joi.string(),
        filter: Joi.object() // Vous pouvez définir une structure plus précise pour l'objet de filtre si nécessaire
    });

    /**
     * Récupère tous les utilisateurs avec pagination, recherche et filtrage.
     * @param {Object} request - L'objet de requête Express.
     * @param {Object} response - L'objet de réponse Express.
     * @param {function} next - La fonction next Express.
     * @returns {Promise<void>}
     */
    async getAll(request, response, next) {
        try {
            // Valider les données de la requête
            const { error } = this.querySchema.validate(request.query);
            if (error) {
                this.logger.logger.error("Validation Error: ", error.details);
                return next(new ErrorResponse(error.details[0].message, 400));
            }

            const resPerPage = parseInt(process.env.RES_PER_PAGE, 10) || 4; // Récupérer à partir de la configuration
            const userCount = await this.model.countDocuments();
            const apiFeatures = new APIFeatures(this.model.find(), request.query)
                .search()
                .filter()
                .paginate(resPerPage); // Passer resPerPage à paginate

            const users = await apiFeatures.query;
            this.logger.logger.info("Users retrieved successfully");
            response.status(200).json({
                success: true,
                count: users.length,
                userCount,
                resPerPage,
                users
            });
        } catch (error) {
            this.handleError(error, "Error retrieving users", next); // Utiliser la fonction de gestion des erreurs
        }
    }

    /**
     * Récupère un utilisateur par ID.
     * @param {Object} request - L'objet de requête Express.
     * @param {Object} response - L'objet de réponse Express.
     * @param {function} next - La fonction next Express.
     * @returns {Promise<void>}
     */
    async getOne(request, response, next) {
        try {
            const user = await this.model.findById(request.params.id);
            if (!user) {
                this.logger.logger.error(`User not found with ID ${request.params.id}`);
                return next(new ErrorResponse('Aucun utilisateur trouvé avec cet ID', 404));
            }
            this.logger.logger.info(`User retrieved successfully with ID ${request.params.id}`);
            response.status(200).json({
                success: true,
                user
            });
        } catch (error) {
            this.handleError(error, "Error retrieving user", next); // Utiliser la fonction de gestion des erreurs
        }
    }

    /**
     * Supprime un utilisateur par ID.
     * @param {Object} request - L'objet de requête Express.
     * @param {Object} response - L'objet de réponse Express.
     * @param {function} next - La fonction next Express.
     * @returns {Promise<void>}
     */
    async delete(request, response, next) {
        try {
            const user = await this.model.findByIdAndDelete(request.params.id);
            if (!user) {
                this.logger.logger.error(`User not found with ID ${request.params.id}`);
                return next(new ErrorResponse('Aucun utilisateur trouvé avec cet ID', 404));
            }
            this.logger.logger.info(`User deleted successfully with ID ${request.params.id}`);
            response.status(204).json({
                success: true,
                data: null
            });
        } catch (error) {
            this.handleError(error, "Error deleting user", next); // Utiliser la fonction de gestion des erreurs
        }
    }

    /**
     * Met à jour un utilisateur par ID.
     * @param {Object} request - L'objet de requête Express.
     * @param {Object} response - L'objet de réponse Express.
     * @param {function} next - La fonction next Express.
     * @returns {Promise<void>}
     */
    async update(request, response, next) {
        try {
            const user = await this.model.findByIdAndUpdate(request.params.id, request.body, {
                new: true,
                runValidators: true,
            });
            if (!user) {
                this.logger.logger.error(`User not found with ID ${request.params.id}`);
                return next(new ErrorResponse('Aucun utilisateur trouvé avec cet ID', 404));
            }
            this.logger.logger.info(`User updated successfully with ID ${request.params.id}`);
            response.status(200).json({
                success: true,
                user
            });
        } catch (error) {
            this.handleError(error, "Error updating user", next); // Utiliser la fonction de gestion des erreurs
        }
    }

    /**
     * Fonction de gestion des erreurs centralisée.
     * @param {Error} error - L'erreur à gérer.
     * @param {string} message - Le message d'erreur personnalisé.
     * @param {function} next - La fonction next Express.
     * @returns {void}
     */
    handleError(error, message, next) {
        this.logger.logger.error(message + ": ", error.message);
        if (error.name === 'CastError') {
            next(new ErrorResponse('ID invalide', 400)); // Gérer spécifiquement les erreurs CastError
        } else if (error.name === 'ValidationError') {
            next(new ErrorResponse(error.message, 422)); // Gérer les erreurs de validation
        }
         else {
            next(new ErrorResponse(message, 500)); // Erreur interne du serveur par défaut
        }
    }
}

export default User;
