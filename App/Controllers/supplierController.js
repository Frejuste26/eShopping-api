import supplierModel from "../Models/supplier.js";
import ErrorResponse from '../Utils/errorResponse.js';
import APIFeatures from '../Utils/apiFeatures.js';
import Logger from '../Utils/Logger.js';
import Joi from 'joi';

class Supplier {

    // Schéma de validation pour les ID MongoDB
    idSchema = Joi.object({
        id: Joi.string().hex().length(24).required().messages({
            'string.base': 'L\'ID doit être une chaîne de caractères.',
            'string.hex': 'L\'ID doit être une chaîne hexadécimale.',
            'string.length': 'L\'ID doit avoir une longueur de 24 caractères.',
            'any.required': 'L\'ID est requis.'
        })
    });

    // Schéma de validation pour la création d'un fournisseur
    createSchema = Joi.object({
        name: Joi.string().trim().required().messages({
            'any.required': 'Le nom du fournisseur est requis.',
            'string.empty': 'Le nom du fournisseur ne peut pas être vide.'
        }),
        contactName: Joi.string().trim().optional(),
        email: Joi.string().email().required().messages({
            'any.required': 'L\'email du fournisseur est requis.',
            'string.email': 'L\'email doit être une adresse email valide.'
        }),
        phone: Joi.string().trim().optional(),
        address: Joi.string().trim().optional(),
        image: Joi.string().optional() // Accepte un chemin de fichier local
    });

    // Schéma de validation pour la mise à jour d'un fournisseur
    updateSchema = Joi.object({
        name: Joi.string().trim().messages({
            'string.empty': 'Le nom du fournisseur ne peut pas être vide.'
        }),
        contactName: Joi.string().trim().optional(),
        email: Joi.string().email().messages({
            'string.email': 'L\'email doit être une adresse email valide.'
        }),
        phone: Joi.string().trim().optional(),
        address: Joi.string().trim().optional(),
        image: Joi.string().optional() // Accepte un chemin de fichier local
    }).min(1).messages({
        'object.min': 'Au moins un champ est requis pour la mise à jour.'
    });

    constructor() {
        this.model = supplierModel;
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
     * Récupère tous les fournisseurs avec pagination, recherche et filtrage.
     * @param {Object} request - L'objet de requête Express.
     * @param {Object} response - L'objet de réponse Express.
     * @param {function} next - La fonction next Express.
     * @returns {Promise<void>}
     */
    async getAll(request, response, next) {
        try {
            // Valider les données de la requête (query params)
            const { error: queryValidationError } = this.querySchema.validate(request.query);
            if (queryValidationError) {
                this.logger.logger.error("Validation Error (Query): ", queryValidationError.details);
                return next(new ErrorResponse(queryValidationError.details[0].message, 400));
            }

            const resPerPage = parseInt(process.env.RES_PER_PAGE, 10) || 4; // Récupérer à partir de la configuration
            const suppliersCount = await this.model.countDocuments();
            const apiFeatures = new APIFeatures(this.model.find(), request.query)
                .search()
                .filter()
                .paginate(resPerPage); // Passer resPerPage à paginate

            const suppliers = await apiFeatures.query;
            this.logger.logger.info("Suppliers retrieved successfully");
            response.status(200).json({
                success: true,
                count: suppliers.length,
                suppliersCount,
                resPerPage,
                suppliers
            });
        } catch (error) {
            this.logger.logger.error("Error retrieving suppliers: ", error);
            next(error);
        }
    }

    /**
     * Récupère un fournisseur par ID.
     * @param {Object} request - L'objet de requête Express.
     * @param {Object} response - L'objet de réponse Express.
     * @param {function} next - La fonction next Express.
     * @returns {Promise<void>}
     */
    async getOne(request, response, next) {
        try {
            // Valider l'ID de la requête
            const { error: idValidationError } = this.idSchema.validate(request.params);
            if (idValidationError) {
                this.logger.logger.error("Validation Error (ID): ", idValidationError.details);
                return next(new ErrorResponse(idValidationError.details[0].message, 400));
            }

            const supplier = await this.model.findById(request.params.id);
            if (!supplier) {
                this.logger.logger.error(`Supplier not found with id ${request.params.id}`);
                return next(new ErrorResponse('Aucun fournisseur trouvé avec cet ID', 404));
            }
            this.logger.logger.info(`Supplier retrieved successfully with id ${request.params.id}`);
            response.status(200).json({
                success: true,
                supplier
            });
        } catch (error) {
            this.logger.logger.error("Error retrieving supplier: ", error);
            next(error);
        }
    }

    /**
     * Crée un nouveau fournisseur.
     * @param {Object} request - L'objet de requête Express.
     * @param {Object} response - L'objet de réponse Express.
     * @param {function} next - La fonction next Express.
     * @returns {Promise<void>}
     */
    async create(request, response, next) {
        // Gérer le fichier uploadé
        if (request.file) {
            request.body.image = request.file.path;
        }

        try {
            // Valider les données du corps de la requête
            const { error: createValidationError } = this.createSchema.validate(request.body);
            if (createValidationError) {
                this.logger.logger.error("Validation Error (Create Supplier Body): ", createValidationError.details);
                return next(new ErrorResponse(createValidationError.details[0].message, 400));
            }

            const supplier = await this.model.create(request.body);
            this.logger.logger.info(`Supplier created successfully with id ${supplier._id}`);
            response.status(201).json({
                success: true,
                supplier
            });
        } catch (error) {
            this.logger.logger.error("Error creating supplier: ", error);
            next(error);
        }
    }

    /**
     * Met à jour un fournisseur par ID.
     * @param {Object} request - L'objet de requête Express.
     * @param {Object} response - L'objet de réponse Express.
     * @param {function} next - La fonction next Express.
     * @returns {Promise<void>}
     */
    async update(request, response, next) {
        // Gérer le fichier uploadé
        if (request.file) {
            request.body.image = request.file.path;
        }

        try {
            // Valider l'ID de la requête
            const { error: idValidationError } = this.idSchema.validate(request.params);
            if (idValidationError) {
                this.logger.logger.error("Validation Error (ID): ", idValidationError.details);
                return next(new ErrorResponse(idValidationError.details[0].message, 400));
            }

            // Valider les données du corps de la requête
            const { error: bodyValidationError } = this.updateSchema.validate(request.body);
            if (bodyValidationError) {
                this.logger.logger.error("Validation Error (Update Supplier Body): ", bodyValidationError.details);
                return next(new ErrorResponse(bodyValidationError.details[0].message, 400));
            }

            const supplier = await this.model.findByIdAndUpdate(request.params.id, request.body, {
                new: true,
                runValidators: true,
            });
            if (!supplier) {
                this.logger.logger.error(`Supplier not found with id ${request.params.id}`);
                return next(new ErrorResponse('Aucun fournisseur trouvé avec cet ID', 404));
            }
            this.logger.logger.info(`Supplier updated successfully with id ${request.params.id}`);
            response.status(200).json({
                success: true,
                supplier
            });
        } catch (error) {
            this.logger.logger.error("Error updating supplier: ", error);
            next(error);
        }
    }

    /**
     * Supprime un fournisseur par ID.
     * @param {Object} request - L'objet de requête Express.
     * @param {Object} response - L'objet de réponse Express.
     * @param {function} next - La fonction next Express.
     * @returns {Promise<void>}
     */
    async delete(request, response, next) {
        try {
            // Valider l'ID de la requête
            const { error: idValidationError } = this.idSchema.validate(request.params);
            if (idValidationError) {
                this.logger.logger.error("Validation Error (ID): ", idValidationError.details);
                return next(new ErrorResponse(idValidationError.details[0].message, 400));
            }

            const supplier = await this.model.findByIdAndDelete(request.params.id);
            if (!supplier) {
                this.logger.logger.error(`Supplier not found with id ${request.params.id}`);
                return next(new ErrorResponse('Aucun fournisseur trouvé avec cet ID', 404));
            }
            this.logger.logger.info(`Supplier deleted successfully with id ${request.params.id}`);
            response.status(204).json({ // Utiliser le code d'état 204
                success: true,
            });
        } catch (error) {
            this.logger.logger.error("Error deleting supplier: ", error);
            next(error);
        }
    }


}

export default Supplier;
