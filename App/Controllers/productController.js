import productModel from '../Models/product.js';
import ErrorResponse from '../Utils/errorResponse.js';
import APIFeatures from '../Utils/apiFeatures.js';
import Logger from '../Utils/Logger.js';
import Joi from 'joi';

class Product {

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

    // Schéma de validation pour la création d'un produit
    createSchema = Joi.object({
        name: Joi.string().trim().required().messages({
            'any.required': 'Le nom du produit est requis.',
            'string.empty': 'Le nom du produit ne peut pas être vide.'
        }),
        description: Joi.string().trim().required().messages({
            'any.required': 'La description du produit est requise.',
            'string.empty': 'La description du produit ne peut pas être vide.'
        }),
        price: Joi.number().min(0).required().messages({
            'any.required': 'Le prix est requis.',
            'number.base': 'Le prix doit être un nombre.',
            'number.min': 'Le prix ne peut pas être négatif.'
        }),
        priceDiscount: Joi.number().min(0).optional().less(Joi.ref('price')).messages({
            'number.base': 'Le prix réduit doit être un nombre.',
            'number.min': 'Le prix réduit ne peut pas être négatif.',
            'number.less': 'Le prix réduit doit être inférieur au prix normal.'
        }),
        category: Joi.string().hex().length(24).required().messages({
            'any.required': 'L\'ID de la catégorie est requis.',
            'string.hex': 'L\'ID de la catégorie doit être une chaîne hexadécimale valide.',
            'string.length': 'L\'ID de la catégorie doit avoir 24 caractères.'
        }),
        brand: Joi.string().hex().length(24).optional().messages({
            'string.hex': 'L\'ID de la marque doit être une chaîne hexadécimale valide.',
            'string.length': 'L\'ID de la marque doit avoir 24 caractères.'
        }),
        variants: Joi.array().items(Joi.string().hex().length(24)).optional().messages({
            'array.base': 'Les variantes doivent être un tableau d\'IDs.',
            'string.hex': 'Chaque ID de variante doit être une chaîne hexadécimale valide.',
            'string.length': 'Chaque ID de variante doit avoir 24 caractères.'
        }),
        stock: Joi.number().integer().min(0).required().messages({
            'any.required': 'Le stock est requis.',
            'number.base': 'Le stock doit être un nombre.',
            'number.integer': 'Le stock doit être un entier.',
            'number.min': 'Le stock ne peut pas être négatif.'
        }),
        image: Joi.array().items(Joi.string()).optional().messages({ // Modifié de .uri() à .string() pour accepter les chemins de fichiers locaux
            'array.base': 'Les images doivent être un tableau d\'URLs.',
            'string.uri': 'Chaque image doit être une URL valide.'
        })
        // ratingsAverage, ratingsQuantity, rating, numReviews sont généralement gérés par d'autres logiques (ex: après un avis)
        // isAvailable est géré par un pre-save hook dans le modèle
    });

    // Schéma de validation pour la mise à jour d'un produit
    updateSchema = Joi.object({
        name: Joi.string().trim().messages({
            'string.empty': 'Le nom du produit ne peut pas être vide.'
        }),
        description: Joi.string().trim().messages({
            'string.empty': 'La description du produit ne peut pas être vide.'
        }),
        price: Joi.number().min(0).messages({
            'number.base': 'Le prix doit être un nombre.',
            'number.min': 'Le prix ne peut pas être négatif.'
        }),
        priceDiscount: Joi.number().min(0).optional().less(Joi.ref('price')).messages({
            'number.base': 'Le prix réduit doit être un nombre.',
            'number.min': 'Le prix réduit ne peut pas être négatif.',
            'number.less': 'Le prix réduit doit être inférieur au prix normal.'
        }),
        category: Joi.string().hex().length(24).messages({
            'string.hex': 'L\'ID de la catégorie doit être une chaîne hexadécimale valide.',
            'string.length': 'L\'ID de la catégorie doit avoir 24 caractères.'
        }),
        brand: Joi.string().hex().length(24).optional().messages({
            'string.hex': 'L\'ID de la marque doit être une chaîne hexadécimale valide.',
            'string.length': 'L\'ID de la marque doit avoir 24 caractères.'
        }),
        variants: Joi.array().items(Joi.string().hex().length(24)).optional().messages({
            'array.base': 'Les variantes doivent être un tableau d\'IDs.',
            'string.hex': 'Chaque ID de variante doit être une chaîne hexadécimale valide.',
            'string.length': 'Chaque ID de variante doit avoir 24 caractères.'
        }),
        stock: Joi.number().integer().min(0).messages({
            'number.base': 'Le stock doit être un nombre.',
            'number.integer': 'Le stock doit être un entier.',
            'number.min': 'Le stock ne peut pas être négatif.'
        }),
        image: Joi.array().items(Joi.string()).optional().messages({ // Modifié de .uri() à .string() pour accepter les chemins de fichiers locaux
            'array.base': 'Les images doivent être un tableau d\'URLs.',
            'string.uri': 'Chaque image doit être une URL valide.'
        })
    }).min(1).messages({
        'object.min': 'Au moins un champ est requis pour la mise à jour.'
    });

    constructor() {
        this.model = productModel;
        this.logger = new Logger();
    }

    async getAll(request, response, next) {
        try {
            // Valider les données de la requête (query params)
            const { error: queryError } = this.querySchema.validate(request.query);
            if (queryError) {
                this.logger.logger.error("Validation Error (Query): ", queryError.details);
                return next(new ErrorResponse(queryError.details[0].message, 400));
            }

            const resPerPage = parseInt(process.env.RES_PER_PAGE, 10) || 4;
            const productsCount = await this.model.countDocuments();
            const apiFeatures = new APIFeatures(this.model.find(), request.query)
                .search()
                .filter()
                .paginate(resPerPage);

            const products = await apiFeatures.query;
            this.logger.logger.info("Products retrieved successfully");
            response.status(200).json({
                success: true,
                count: products.length,
                productsCount,
                resPerPage,
                products
            })
        } catch (error) {
            this.logger.logger.error("Error retrieving products: " + error.message);
            next(new ErrorResponse("Error retrieving products", 500));
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

            const product = await this.model.findById(request.params.id);
            if (!product) {
                this.logger.logger.error(`Product not found with ID ${request.params.id}`);
                return next(new ErrorResponse('Aucun produit trouvé avec cet ID', 404));
            }
            this.logger.logger.info(`Product retrieved successfully with ID ${request.params.id}`);
            response.status(200).json({
                success: true,
                product
            });
        } catch (error) {
            this.logger.logger.error("Error retrieving product: " + error.message);
            next(new ErrorResponse("Error retrieving product", 500));
        }
    };

    async create(request, response, next) {
        // Gérer le fichier uploadé
        if (request.file) {
            request.body.image = [request.file.path]; // Le schéma attend un tableau de chemins/URLs
        }

        try {
            // Valider les données du corps de la requête
            const { error } = this.createSchema.validate(request.body);
            if (error) {
                this.logger.logger.error("Validation Error (Create Product Body): ", error.details);
                return next(new ErrorResponse(error.details[0].message, 400));
            }

            const product = await this.model.create(request.body);
            this.logger.logger.info(`Product created successfully with ID ${product._id}`);
            response.status(201).json({
                success: true,
                product
            });
        } catch (error) {
            this.logger.logger.error("Error creating product: " + error.message);
            next(new ErrorResponse("Error creating product", 500));
        }
    };

    async update(request, response, next) {
        // Gérer le fichier uploadé
        if (request.file) {
            request.body.image = [request.file.path]; // Le schéma attend un tableau de chemins/URLs
        }

        try {
            // Valider l'ID de la requête
            const { error: idError } = this.idSchema.validate(request.params);
            if (idError) {
                this.logger.logger.error("Validation Error (ID): ", idError.details);
                return next(new ErrorResponse(idError.details[0].message, 400));
            }

            // Valider les données du corps de la requête
            const { error: bodyError } = this.updateSchema.validate(request.body);
            if (bodyError) {
                this.logger.logger.error("Validation Error (Update Product Body): ", bodyError.details);
                return next(new ErrorResponse(bodyError.details[0].message, 400));
            }

            const product = await this.model.findByIdAndUpdate(request.params.id, request.body, {
                new: true,
                runValidators: true,
                useFindAndModify: false
            });
            if (!product) {
                this.logger.logger.error(`Product not found with ID ${request.params.id}`);
                return next(new ErrorResponse('Aucun produit trouvé avec cet ID', 404));
            }
            this.logger.logger.info(`Product updated successfully with ID ${request.params.id}`);
            response.status(200).json({
                success: true,
                product
            });
        } catch (error) {
            this.logger.logger.error("Error updating product: " + error.message);
            next(new ErrorResponse("Error updating product", 500));
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

            const product = await this.model.findByIdAndDelete(request.params.id);
            if (!product) {
                this.logger.logger.error(`Product not found with ID ${request.params.id}`);
                return next(new ErrorResponse('Aucun produit trouvé avec cet ID', 404));
            }
            this.logger.logger.info(`Product deleted successfully with ID ${request.params.id}`);
            response.status(204).json({
                success: true,
                data: null
            });
        } catch (error) {
            this.logger.logger.error("Error deleting product: " + error.message);
            next(new ErrorResponse("Error deleting product", 500));
        }
    }
}

export default Product;