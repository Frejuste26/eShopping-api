import productVariantModel from "../Models/productVariant.js";
import ErrorResponse from '../Utils/errorResponse.js';
import APIFeatures from '../Utils/apiFeatures.js';
import Logger from '../Utils/Logger.js';
import Joi from 'joi';


class ProductVariantController {
    constructor() {
        // Injection de dépendance : le modèle est injecté, pas instancié ici
        this.model = productVariantModel;
        this.logger = new Logger();
    }

    // Schéma de validation pour les ID MongoDB
    idSchema = Joi.object({
        id: Joi.string().hex().length(24).required().messages({
            'string.base': 'L\'ID doit être une chaîne de caractères.',
            'string.hex': 'L\'ID doit être une chaîne hexadécimale.',
            'string.length': 'L\'ID doit avoir une longueur de 24 caractères.',
            'any.required': 'L\'ID est requis.'
        })
    });

    // Schéma de validation pour la pagination et la recherche
    querySchema = Joi.object({
        page: Joi.number().integer().min(1),
        limit: Joi.number().integer().min(1),
        search: Joi.string(),
        filter: Joi.object() // Vous pouvez définir une structure plus précise pour l'objet de filtre si nécessaire
    });

    // Schéma de validation pour la création
    createSchema = Joi.object({
        color: Joi.string().trim().required().valid('Rouge', 'Vert', 'Bleu', 'Orange', 'Noire', 'Blanche', 'Bordeaux', 'Rose', 'Jaune', 'Marron', 'Beige', 'Gris', 'Violet', 'Multicolore').messages({
            'any.required': 'La couleur est requise.',
            'string.empty': 'La couleur ne peut pas être vide.',
            'any.only': 'Couleur non valide.'
        }),
        size: Joi.string().trim().required().valid('S', 'M', 'L', 'XL', 'XXL', 'XXXL').messages({
            'any.required': 'La taille est requise.',
            'string.empty': 'La taille ne peut pas être vide.',
            'any.only': 'Taille non valide.'
        }),
        stock: Joi.number().min(0).required().messages({
            'any.required': 'Le stock est requis.',
            'number.base': 'Le stock doit être un nombre.',
            'number.min': 'Le stock ne peut pas être négatif.'
        })
    });

    // Schéma de validation pour la mise à jour
    updateSchema = Joi.object({
        color: Joi.string().trim().valid('Rouge', 'Vert', 'Bleu', 'Orange', 'Noire', 'Blanche', 'Bordeaux', 'Rose', 'Jaune', 'Marron', 'Beige', 'Gris', 'Violet', 'Multicolore').messages({
            'string.empty': 'La couleur ne peut pas être vide.',
            'any.only': 'Couleur non valide.'
        }),
        size: Joi.string().trim().valid('S', 'M', 'L', 'XL', 'XXL', 'XXXL').messages({
            'string.empty': 'La taille ne peut pas être vide.',
            'any.only': 'Taille non valide.'
        }),
        stock: Joi.number().min(0).messages({
            'number.base': 'Le stock doit être un nombre.',
            'number.min': 'Le stock ne peut pas être négatif.'
        })
    }).min(1); // Au moins un champ doit être présent pour la mise à jour

    /**
     * Récupère toutes les variantes de produit avec pagination, recherche et filtrage.
     * @param request - L'objet de requête Express.
     * @param response - L'objet de réponse Express.
     * @param next - La fonction next Express.
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

            const resPerPage = parseInt(process.env.RES_PER_PAGE, 10) || 4;
            const productVariantCount = await this.model.countDocuments();
            const apiFeatures = new APIFeatures(this.model.find(), request.query)
                .search()
                .filter()
                .paginate(resPerPage);

            const productVariants = await apiFeatures.query;
            this.logger.logger.info(`Product Variants fetched successfully`);
            response.status(200).json({
                success: true,
                count: productVariants.length,
                productVariantCount,
                resPerPage,
                productVariants
            });
        } catch (error) {
            this.logger.logger.error("Error retrieving product variants: ", error);
            next(error);
        }
    };

    /**
     * Récupère une variante de produit par ID.
     * @param request - L'objet de requête Express.
     * @param response - L'objet de réponse Express.
     * @param next - La fonction next Express.
     * @returns {Promise<void>}
     */
    async getOne(request, response, next) {
        try {
            // Valider l'ID de la requête
            const { error: idError } = this.idSchema.validate(request.params);
            if (idError) {
                this.logger.logger.error("Validation Error (ID): ", idError.details);
                return next(new ErrorResponse(idError.details[0].message, 400));
            }

            const productVariant = await this.model.findById(request.params.id);
            if (!productVariant) {
                this.logger.logger.error(`Product Variant not found with id of ${request.params.id}`);
                return next(new ErrorResponse(`Product Variant not found with id of ${request.params.id}`, 404));
            }
            this.logger.logger.info(`Product Variant fetched successfully`);
            response.status(200).json({
                success: true,
                productVariant
            });
        } catch (error) {
            this.logger.logger.error("Error retrieving product variant: ", error);
            next(error);
        }
    }

    /**
     * Crée une nouvelle variante de produit.
     * @param request - L'objet de requête Express.
     * @param response - L'objet de réponse Express.
     * @param next - La fonction next Express.
     * @returns {Promise<void>}
     */
    async create(request, response, next) {
        try {
            // Valider les données de la requête
            const { error } = this.createSchema.validate(request.body);
            if (error) {
                this.logger.logger.error("Validation Error: ", error.details);
                return next(new ErrorResponse(error.details[0].message, 400));
            }

            const productVariant = await this.model.create(request.body);
            this.logger.logger.info(`Product Variant created successfully`);
            response.status(201).json({
                success: true,
                productVariant
            });
        } catch (error) {
            this.logger.logger.error("Error creating product variant: ", error);
            next(error);
        }
    };

    /**
     * Met à jour une variante de produit par ID.
     * @param request - L'objet de requête Express.
     * @param response - L'objet de réponse Express.
     * @param next - La fonction next Express.
     * @returns {Promise<void>}
     */
    async update(request, response, next) {
        try {
            // Valider l'ID de la requête
            const { error: idError } = this.idSchema.validate(request.params);
            if (idError) {
                this.logger.logger.error("Validation Error (ID): ", idError.details);
                return next(new ErrorResponse(idError.details[0].message, 400));
            }

            // Valider les données de la requête
            const { error } = this.updateSchema.validate(request.body);
            if (error) {
                this.logger.logger.error("Validation Error: ", error.details);
                return next(new ErrorResponse(error.details[0].message, 400));
            }
            const productVariant = await this.model.findByIdAndUpdate(request.params.id, request.body, {
                new: true,
                runValidators: true,
            });
            if (!productVariant) {
                this.logger.logger.error(`Product Variant not found with id of ${request.params.id}`);
                return next(new ErrorResponse(`Product Variant not found with id of ${request.params.id}`, 404));
            }
            this.logger.logger.info(`Product Variant updated successfully`);
            response.status(200).json({
                success: true,
                productVariant
            });
        } catch (error) {
            this.logger.logger.error("Error updating product variant: ", error);
            next(error);
        }
    };

    /**
     * Supprime une variante de produit par ID.
     * @param request - L'objet de requête Express.
     * @param response - L'objet de réponse Express.
     * @param next - La fonction next Express.
     * @returns {Promise<void>}
     */
    async delete(request, response, next) {
        try {
            // Valider l'ID de la requête
            const { error: idError } = this.idSchema.validate(request.params);
            if (idError) {
                this.logger.logger.error("Validation Error (ID): ", idError.details);
                return next(new ErrorResponse(idError.details[0].message, 400));
            }

            const productVariant = await this.model.findByIdAndDelete(request.params.id);
            if (!productVariant) {
                this.logger.logger.error(`Product Variant not found with id of ${request.params.id}`);
                return next(new ErrorResponse(`Product Variant not found with id of ${request.params.id}`, 404));
            }
            this.logger.logger.info(`Product Variant deleted successfully`);
            response.status(204).json({ success: true }); // Utiliser le code 204
        } catch (error) {
            this.logger.logger.error("Error deleting product variant: ", error);
            next(error);
        }
    };


}

export default ProductVariantController;
