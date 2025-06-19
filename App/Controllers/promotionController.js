import promotionModel from "../Models/promotion.js";
import ErrorResponse from "../Utils/errorResponse.js";
import APIFeatures from "../Utils/apiFeatures.js";
import Logger from "../Utils/Logger.js";
import Joi from 'joi';

class Promotion {

    // Schéma de validation pour les ID MongoDB
    idSchema = Joi.object({
        id: Joi.string().hex().length(24).required().messages({
            'string.base': 'L\'ID doit être une chaîne de caractères.',
            'string.hex': 'L\'ID doit être une chaîne hexadécimale.',
            'string.length': 'L\'ID doit avoir une longueur de 24 caractères.',
            'any.required': 'L\'ID est requis.'
        })
    });

    // Schéma de validation pour la création d'une promotion
    createSchema = Joi.object({
        name: Joi.string().trim().required().messages({
            'any.required': 'Le nom de la promotion est requis.',
            'string.empty': 'Le nom de la promotion ne peut pas être vide.'
        }),
        description: Joi.string().trim().optional(),
        type: Joi.string().valid('percentage', 'fixed').required().messages({
            'any.required': 'Le type de promotion est requis.',
            'any.only': 'Le type doit être soit "percentage" soit "fixed".'
        }),
        value: Joi.number().required().when('type', {
            is: 'percentage',
            then: Joi.number().min(0.01).max(100).messages({
                'number.min': 'La valeur en pourcentage doit être supérieure à 0.',
                'number.max': 'La valeur en pourcentage ne peut pas dépasser 100.'
            }),
            otherwise: Joi.number().min(0.01).messages({
                'number.min': 'La valeur fixe doit être supérieure à 0.'
            })
        }).messages({
            'any.required': 'La valeur de la promotion est requise.'
        }),
        productId: Joi.string().hex().length(24).required().messages({
            'any.required': 'L\'ID du produit est requis.',
            'string.hex': 'L\'ID du produit doit être une chaîne hexadécimale valide.',
            'string.length': 'L\'ID du produit doit avoir 24 caractères.'
        }),
        startDate: Joi.date().iso().min('now').required().messages({
            'any.required': 'La date de début est requise.',
            'date.format': 'La date de début doit être au format ISO.',
            'date.min': 'La date de début ne peut pas être antérieure à maintenant.'
        }),
        endDate: Joi.date().iso().greater(Joi.ref('startDate')).required().messages({
            'any.required': 'La date de fin est requise.',
            'date.format': 'La date de fin doit être au format ISO.',
            'date.greater': 'La date de fin doit être postérieure à la date de début.'
        }),
        minPurchase: Joi.number().min(0).optional().messages({
            'number.min': 'Le montant minimum d\'achat ne peut pas être négatif.'
        }),
        maxUsage: Joi.number().integer().min(1).optional().messages({
            'number.integer': 'Le nombre maximum d\'utilisations doit être un entier.',
            'number.min': 'Le nombre maximum d\'utilisations doit être au moins de 1.'
        }),
        conditions: Joi.object().optional() // Peut être affiné plus tard
    });

    // Schéma de validation pour la mise à jour d'une promotion
    updateSchema = Joi.object({
        name: Joi.string().trim().messages({
            'string.empty': 'Le nom de la promotion ne peut pas être vide.'
        }),
        description: Joi.string().trim().optional(),
        type: Joi.string().valid('percentage', 'fixed').messages({
            'any.only': 'Le type doit être soit "percentage" soit "fixed".'
        }),
        value: Joi.number().when('type', {
            is: 'percentage',
            then: Joi.number().min(0.01).max(100).messages({
                'number.min': 'La valeur en pourcentage doit être supérieure à 0.',
                'number.max': 'La valeur en pourcentage ne peut pas dépasser 100.'
            }),
            otherwise: Joi.number().min(0.01).messages({
                'number.min': 'La valeur fixe doit être supérieure à 0.'
            })
        }),
        productId: Joi.string().hex().length(24).messages({
            'string.hex': 'L\'ID du produit doit être une chaîne hexadécimale valide.',
            'string.length': 'L\'ID du produit doit avoir 24 caractères.'
        }),
        startDate: Joi.date().iso().min('now').messages({
            'date.format': 'La date de début doit être au format ISO.',
            'date.min': 'La date de début ne peut pas être antérieure à maintenant.'
        }),
        endDate: Joi.date().iso().greater(Joi.ref('startDate')).messages({
            'date.format': 'La date de fin doit être au format ISO.',
            'date.greater': 'La date de fin doit être postérieure à la date de début.'
        }),
        active: Joi.boolean(),
        minPurchase: Joi.number().min(0).messages({
            'number.min': 'Le montant minimum d\'achat ne peut pas être négatif.'
        }),
        maxUsage: Joi.number().integer().min(1).messages({
            'number.integer': 'Le nombre maximum d\'utilisations doit être un entier.',
            'number.min': 'Le nombre maximum d\'utilisations doit être au moins de 1.'
        }),
        conditions: Joi.object().optional()
    }).min(1).messages({
        'object.min': 'Au moins un champ est requis pour la mise à jour.'
    });

    constructor() {
        this.model = promotionModel;
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
     * Récupère toutes les promotions avec pagination, recherche et filtrage.
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
                this.logger.error("Validation Error: ", error.details);
                return next(new ErrorResponse(error.details[0].message, 400));
            }

            const resPerPage = parseInt(process.env.RES_PER_PAGE, 10) || 4; // Récupérer à partir de la configuration
            const promotionsCount = await this.model.countDocuments();
            const apiFeatures = new APIFeatures(this.model.find(), request.query)
                .search()
                .filter()
                .paginate(resPerPage); // Passer resPerPage à paginate

            const promotions = await apiFeatures.query;
            this.logger.info("Promotions retrieved successfully");
            response.status(200).json({
                success: true,
                count: promotions.length,
                promotionsCount,
                resPerPage,
                promotions
            });
        } catch (error) {
            this.handleError(error, "Error retrieving promotions", next); // Utiliser la fonction de gestion des erreurs
        }
    }

    /**
     * Récupère une promotion par ID.
     * @param {Object} request - L'objet de requête Express.
     * @param {Object} response - L'objet de réponse Express.
     * @param {function} next - La fonction next Express.
     * @returns {Promise<void>}
     */
    async getOne(request, response, next) {
        try {
            // Valider l'ID de la requête
            const { error: idError } = this.idSchema.validate(request.params);
            if (idError) {
                this.logger.error("Validation Error (ID): ", idError.details);
                return next(new ErrorResponse(idError.details[0].message, 400));
            }

            const promotion = await this.model.findById(request.params.id);
            if (!promotion) {
                this.logger.error("Promotion not found");
                return next(new ErrorResponse("Promotion not found", 404));
            }
            this.logger.info("Promotion retrieved successfully");
            response.status(200).json({
                success: true,
                promotion
            });
        } catch (error) {
            this.handleError(error, "Error retrieving promotion", next); // Utiliser la fonction de gestion des erreurs
        }
    }

    /**
     * Crée une nouvelle promotion.
     * @param {Object} request - L'objet de requête Express.
     * @param {Object} response - L'objet de réponse Express.
     * @param {function} next - La fonction next Express.
     * @returns {Promise<void>}
     */
    async create(request, response, next) {
        try {
            // Valider les données du corps de la requête
            const { error } = this.createSchema.validate(request.body);
            if (error) {
                this.logger.error("Validation Error (Create Promotion Body): ", error.details);
                return next(new ErrorResponse(error.details[0].message, 400));
            }

            const promotion = await this.model.create(request.body);
            this.logger.info("Promotion created successfully");
            response.status(201).json({
                success: true,
                promotion
            });
        } catch (error) {
            this.handleError(error, "Error creating promotion", next); // Utiliser la fonction de gestion des erreurs
        }
    }

    /**
     * Met à jour une promotion par ID.
     * @param {Object} request - L'objet de requête Express.
     * @param {Object} response - L'objet de requête Express.
     * @param {function} next - La fonction next Express.
     * @returns {Promise<void>}
     */
    async update(request, response, next) {
        try {
            // Valider l'ID de la requête
            const { error: idError } = this.idSchema.validate(request.params);
            if (idError) {
                this.logger.error("Validation Error (ID): ", idError.details);
                return next(new ErrorResponse(idError.details[0].message, 400));
            }

            // Valider les données du corps de la requête
            const { error: bodyError } = this.updateSchema.validate(request.body);
            if (bodyError) {
                this.logger.error("Validation Error (Update Promotion Body): ", bodyError.details);
                return next(new ErrorResponse(bodyError.details[0].message, 400));
            }

            const promotion = await this.model.findByIdAndUpdate(request.params.id, request.body, {
                new: true,
                runValidators: true,
            });
            if (!promotion) {
                this.logger.error("Promotion not found");
                return next(new ErrorResponse("Promotion not found", 404));
            }
            this.logger.info("Promotion updated successfully");
            response.status(200).json({
                success: true,
                promotion
            });
        } catch (error) {
            this.handleError(error, "Error updating promotion", next); // Utiliser la fonction de gestion des erreurs
        }
    }

    /**
     * Supprime une promotion par ID.
     * @param {Object} request - L'objet de requête Express.
     * @param {Object} response - L'objet de réponse Express.
     * @param {function} next - La fonction next Express.
     * @returns {Promise<void>}
     */
    async delete(request, response, next) {
        try {
            // Valider l'ID de la requête
            const { error: idError } = this.idSchema.validate(request.params);
            if (idError) {
                this.logger.error("Validation Error (ID): ", idError.details);
                return next(new ErrorResponse(idError.details[0].message, 400));
            }

            const promotion = await this.model.findByIdAndDelete(request.params.id);
            if (!promotion) {
                this.logger.error("Promotion not found");
                return next(new ErrorResponse("Promotion not found", 404));
            }
            this.logger.info("Promotion deleted successfully");
            response.status(204).json({ // Utiliser le code d'état 204
                success: true,
            });
        } catch (error) {
            this.handleError(error, "Error deleting promotion", next); // Utiliser la fonction de gestion des erreurs
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
        this.logger.error(message + ": ", error.message);
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

export default Promotion;
