import brandModel from "../Models/brand.js";
import ErrorResponse from '../Utils/errorResponse.js';
import APIFeatures from '../Utils/apiFeatures.js';
import Logger from '../Utils/Logger.js';
import Joi from 'joi';

class Brand {

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
        name: Joi.string().trim().required().messages({
            'any.required': 'Le nom de la marque est requis.',
            'string.empty': 'Le nom de la marque ne peut pas être vide.'
        }),
        description: Joi.string().trim().required().max(500).messages({
            'any.required': 'La description de la marque est requise.',
            'string.empty': 'La description de la marque ne peut pas être vide.',
            'string.max': 'La description ne peut pas dépasser 500 caractères.'
        }),
        logo: Joi.string().required().messages({ // Modifié de .uri() pour accepter les chemins de fichiers locaux
            'any.required': 'Le logo de la marque est requis.',
            'string.uri': 'Le logo doit être une URL valide.'
        }),
        website: Joi.string().trim().uri().messages({
            'string.uri': 'Le site Web doit être une URL valide.'
        })
    });

    // Schéma de validation pour la mise à jour
    updateSchema = Joi.object({
        name: Joi.string().trim().messages({
            'string.empty': 'Le nom de la marque ne peut pas être vide.'
        }),
        description: Joi.string().trim().max(500).messages({
            'string.empty': 'La description de la marque ne peut pas être vide.',
            'string.max': 'La description ne peut pas dépasser 500 caractères.'
        }),
        logo: Joi.string().messages({ // Modifié de .uri() pour accepter les chemins de fichiers locaux
            'string.uri': 'Le logo doit être une URL valide.'
        }),
        website: Joi.string().trim().uri().messages({
            'string.uri': 'Le site Web doit être une URL valide.'
        })
    }).min(1); // Au moins un champ doit être présent pour la mise à jour

    constructor() {
        this.model = brandModel;
        this.logger = new Logger();
    }

    async getAll(request, response, next) {
        try {
            // Valider les données de la requête
            const { error: queryError } = this.querySchema.validate(request.query);
            if (queryError) {
                this.logger.logger.error("Validation Error (Query): ", queryError.details);
                return next(new ErrorResponse(queryError.details[0].message, 400));
            }

            const resPerPage = 4;
            const brandsCount = await this.model.countDocuments();
            const apiFeatures = new APIFeatures(this.model.find(), request.query)
                .search()
                .filter()
               .paginate();
            const brands = await apiFeatures.query;
            this.logger.logger.info("Brands retrieved successfully");
            response.status(200).json({
                success: true,
                count: brands.length,
                brandsCount,
                resPerPage,
                brands
            });
        } catch (error) {
            this.logger.logger.error("Error retrieving brands: " + error.message);
            return next(new ErrorResponse("Error retrieving brands", 500));
        }
    };

    async getOne(request, response, next) {
        try {
            // Valider l'ID de la requête
            const { error: idError } = this.idSchema.validate(request.params);
            if (idError) {
                this.logger.logger.error("Validation Error (ID): ", idError.details);
                return next(new ErrorResponse(idError.details[0].message, 400));
            }

            const brand = await this.model.findById(request.params.id);
            if (!brand) {
                this.logger.logger.error(`Brand not found with id of ${request.params.id}`);
                return next(new ErrorResponse(`Brand not found with id of ${request.params.id}`, 404));
            }
            this.logger.logger.info(`Brand retrieved successfully with id ${request.params.id}`);
            response.status(200).json({
                success: true,
                brand
            });
        } catch (error) {
            this.logger.logger.error("Error retrieving brand: " + error.message);
            return next(new ErrorResponse("Error retrieving brand", 500));
        }
    };

    async create(request, response, next) {
        // Gérer le fichier uploadé
        if (request.file) {
            request.body.logo = request.file.path;
        }

        try {
            // Valider les données de la requête
            const { error } = this.createSchema.validate(request.body);
            if (error) {
                this.logger.logger.error("Validation Error: ", error.details);
                return next(new ErrorResponse(error.details[0].message, 400));
            }

            const brand = await this.model.create(request.body);
            this.logger.logger.info(`Brand created successfully with id ${brand._id}`);
            response.status(201).json({
                success: true,
                brand
            });
        } catch (error) {
            this.logger.logger.error("Error creating brand: " + error.message);
            return next(new ErrorResponse("Error creating brand", 500));
        }
    };

    async update(request, response, next) {
        // Gérer le fichier uploadé
        if (request.file) {
            request.body.logo = request.file.path;
        }

        try {
            // Valider l'ID de la requête
            const { error: idError } = this.idSchema.validate(request.params);
            if (idError) {
                this.logger.logger.error("Validation Error (ID): ", idError.details);
                return next(new ErrorResponse(idError.details[0].message, 400));
            }

            // Valider les données de la requête
            const { error: bodyError } = this.updateSchema.validate(request.body);
            if (bodyError) {
                this.logger.logger.error("Validation Error (Body): ", bodyError.details);
                return next(new ErrorResponse(bodyError.details[0].message, 400));
            }

            const brand = await this.model.findByIdAndUpdate(request.params.id, request.body, {
                new: true,
                runValidators: true,
                useFindAndModify: false
            });
            if (!brand) {
                this.logger.logger.error(`Brand not found with id of ${request.params.id}`);
                return next(new ErrorResponse(`Brand not found with id of ${request.params.id}`, 404));
            }
            this.logger.logger.info(`Brand updated successfully with id ${request.params.id}`);
            response.status(200).json({
                success: true,
                brand
            });
        } catch (error) {
            this.logger.logger.error("Error updating brand: " + error.message);
            return next(new ErrorResponse("Error updating brand", 500));
        }
    };

    async delete(request, response, next) {
        try {
            // Valider l'ID de la requête
            const { error: idError } = this.idSchema.validate(request.params);
            if (idError) {
                this.logger.logger.error("Validation Error (ID): ", idError.details);
                return next(new ErrorResponse(idError.details[0].message, 400));
            }

            const brand = await this.model.findByIdAndDelete(request.params.id);
            if (!brand) {
                this.logger.logger.error(`Brand not found with id of ${request.params.id}`);
                return next(new ErrorResponse(`Brand not found with id of ${request.params.id}`, 404));
            }
            this.logger.logger.info(`Brand deleted successfully with id ${request.params.id}`);
            response.status(200).json({
                success: true,
                message: 'Brand deleted'
            });
        } catch (error) {
            this.logger.logger.error("Error deleting brand: " + error.message);
            return next(new ErrorResponse("Error deleting brand", 500));
        }
    };
}

export default Brand;