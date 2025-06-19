import categoryModel from "../Models/category.js";
import ErrorResponse from '../Utils/errorResponse.js';
import APIFeatures from '../Utils/apiFeatures.js';
import Logger from '../Utils/Logger.js';
import Joi from 'joi';

class Category {

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
            'any.required': 'Le nom de la catégorie est requis.',
            'string.empty': 'Le nom de la catégorie ne peut pas être vide.'
        }),
        description: Joi.string().trim().required().max(500).messages({
            'any.required': 'La description de la catégorie est requise.',
            'string.empty': 'La description de la catégorie ne peut pas être vide.',
            'string.max': 'La description ne peut pas dépasser 500 caractères.'
        }),
        image: Joi.string().required().messages({ // Modifié de .uri() pour accepter les chemins de fichiers locaux
            'any.required': 'L\'image de la catégorie est requise.',
            'string.uri': 'L\'image doit être une URL valide.'
        })
    });

    // Schéma de validation pour la mise à jour
    updateSchema = Joi.object({
        name: Joi.string().trim().messages({
            'string.empty': 'Le nom de la catégorie ne peut pas être vide.'
        }),
        description: Joi.string().trim().max(500).messages({
            'string.empty': 'La description de la catégorie ne peut pas être vide.',
            'string.max': 'La description ne peut pas dépasser 500 caractères.'
        }),
        image: Joi.string().messages({ // Modifié de .uri() pour accepter les chemins de fichiers locaux
            'string.uri': 'L\'image doit être une URL valide.'
        })
    }).min(1); // Au moins un champ doit être présent pour la mise à jour

    constructor() {
        this.model = categoryModel;
        this.logger = new Logger();
    }

    async getAll(request, response, next) {
        try {
            // Valider les données de la requête
            const { error: queryError } = this.querySchema.validate(request.query);
            if (queryError) {
                this.logger.error("Validation Error (Query): ", queryError.details);
                return next(new ErrorResponse(queryError.details[0].message, 400));
            }

            const resPerPage = 4;
            const productsCount = await this.model.countDocuments();
            const apiFeatures = new APIFeatures(this.model.find(), request.query)
                .search()
               .filter()
               .paginate();

            const products = await apiFeatures.query;
            this.logger.info('Produits récupérés avec succès');
            response.status(200).json({
                success: true,
                count: products.length,
                productsCount,
                resPerPage,
                products
            });
        } catch (error) {
            this.logger.error("Error retrieving products: " + error.message);
            next(new ErrorResponse("Error retrieving products", 500));
        }
    }

    async getOne(request, response, next) {
        try {
            // Valider l'ID de la requête
            const { error: idError } = this.idSchema.validate(request.params);
            if (idError) {
                this.logger.error("Validation Error (ID): ", idError.details);
                return next(new ErrorResponse(idError.details[0].message, 400));
            }

            const product = await this.model.findById(request.params.id);
            if (!product) {
                this.logger.error(`Produit non trouvé avec l'ID ${request.params.id}`);
                return next(new ErrorResponse('Aucun produit trouvé avec cet ID', 404));
            }
            this.logger.info(`Produit récupéré avec succès avec l'ID ${request.params.id}`);
            response.status(200).json({
                success: true,
                product
            });
        } catch (error) {
            this.logger.error("Error retrieving product: " + error.message);
            next(new ErrorResponse("Error retrieving product", 500));
        }
    };

    async create(request, response, next) {
        // Gérer le fichier uploadé
        if (request.file) {
            request.body.image = request.file.path;
        }

        try {
            // Valider les données de la requête
            const { error } = this.createSchema.validate(request.body);
            if (error) {
                this.logger.error("Validation Error: ", error.details);
                return next(new ErrorResponse(error.details[0].message, 400));
            }

            const product = await this.model.create(request.body);
            this.info(`Produit créé avec succès avec l'ID ${product._id}`);
            response.status(201).json({
                success: true,
                product
            });
        } catch (error) {
            this.logger.error("Error creating product: " + error.message);
            next(new ErrorResponse("Error creating product", 500));
        }
    };

    async update(request, response, next) {
        // Gérer le fichier uploadé
        if (request.file) {
            request.body.image = request.file.path;
        }

        try {
            // Valider l'ID de la requête
            const { error: idError } = this.idSchema.validate(request.params);
            if (idError) {
                this.logger.error("Validation Error (ID): ", idError.details);
                return next(new ErrorResponse(idError.details[0].message, 400));
            }

            // Valider les données de la requête
            const { error: bodyError } = this.updateSchema.validate(request.body);
            if (bodyError) {
                this.logger.error("Validation Error (Body): ", bodyError.details);
                return next(new ErrorResponse(bodyError.details[0].message, 400));
            }

            const product = await this.model.findByIdAndUpdate(request.params.id, request.body, {
                new: true,
                runValidators: true,
                useFindAndModify: false
            });
            if (!product) {
                this.logger.error(`Produit non trouvé avec l'ID ${request.params.id}`);
                return next(new ErrorResponse('Aucun produit trouvé avec cet ID', 404));
            }
            this.logger.info(`Produit mis à jour avec succès avec l'ID ${request.params.id}`);
            response.status(200).json({
                success: true,
                product
            });
        } catch (error) {
            this.logger.error("Error updating product: " + error.message);
            next(new ErrorResponse("Error updating product", 500));
        }
    };

    async delete(request, response, next) {
        try {
            // Valider l'ID de la requête
            const { error: idError } = this.idSchema.validate(request.params);
            if (idError) {
                this.logger.error("Validation Error (ID): ", idError.details);
                return next(new ErrorResponse(idError.details[0].message, 400));
            }

            const product = await this.model.findByIdAndDelete(request.params.id);
            if (!product) {
                return next(new ErrorResponse('Aucun produit trouvé avec cet ID', 404));
            }
            this.logger.info(`Produit supprimé avec succès avec l'ID ${request.params.id}`);
            response.status(200).json({
                success: true,
                message: 'Produit supprimé avec succès'
            })
        } catch (error) {
            this.logger.error("Error deleting product: " + error.message);
            next(new ErrorResponse("Error deleting product", 500));
        }
    }
}
export default Category;