import orderModel from "../Models/order.js"
import ErrorResponse from "../Utils/errorResponse.js"
import APIFeatures from "../Utils/apiFeatures.js"
import Logger from "../Utils/Logger.js";
import Joi from 'joi';

class Order {

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

    // Schéma de validation pour un item de commande
    orderItemSchema = Joi.object({
        product: Joi.string().hex().length(24).required().messages({
            'any.required': 'L\'ID du produit est requis pour chaque article.',
            'string.hex': 'L\'ID du produit doit être une chaîne hexadécimale valide.',
            'string.length': 'L\'ID du produit doit avoir 24 caractères.'
        }),
        variant: Joi.string().hex().length(24).optional().messages({
            'string.hex': 'L\'ID de la variante doit être une chaîne hexadécimale valide.',
            'string.length': 'L\'ID de la variante doit avoir 24 caractères.'
        }),
        quantity: Joi.number().integer().min(1).required().messages({
            'any.required': 'La quantité est requise pour chaque article.',
            'number.base': 'La quantité doit être un nombre.',
            'number.integer': 'La quantité doit être un entier.',
            'number.min': 'La quantité doit être au moins de 1.'
        }),
        price: Joi.number().min(0).required().messages({
            'any.required': 'Le prix est requis pour chaque article.',
            'number.base': 'Le prix doit être un nombre.',
            'number.min': 'Le prix ne peut pas être négatif.'
        })
    });

    // Schéma de validation pour la création d'une commande
    createSchema = Joi.object({
        user: Joi.string().hex().length(24).required().messages({
            'any.required': 'L\'ID de l\'utilisateur est requis.',
            'string.hex': 'L\'ID de l\'utilisateur doit être une chaîne hexadécimale valide.',
            'string.length': 'L\'ID de l\'utilisateur doit avoir 24 caractères.'
        }),
        items: Joi.array().items(this.orderItemSchema).min(1).required().messages({
            'any.required': 'Au moins un article est requis dans la commande.',
            'array.min': 'La commande doit contenir au moins un article.'
        }),
        shippingAddress: Joi.string().hex().length(24).required().messages({
            'any.required': 'L\'ID de l\'adresse de livraison est requis.',
            'string.hex': 'L\'ID de l\'adresse de livraison doit être une chaîne hexadécimale valide.',
            'string.length': 'L\'ID de l\'adresse de livraison doit avoir 24 caractères.'
        }),
        paymentMethod: Joi.string().valid('card', 'paypal', 'bank_transfer').required().messages({
            'any.required': 'La méthode de paiement est requise.',
            'any.only': 'Méthode de paiement non supportée.'
        }),
        // Les champs comme taxPrice, shippingPrice, totalPrice sont généralement calculés côté serveur
        // isPaid, paidAt, isDelivered, deliveredAt, status sont gérés par des processus ultérieurs
    });

    // Schéma de validation pour la mise à jour d'une commande (principalement le statut)
    updateSchema = Joi.object({
        status: Joi.string().valid('pending', 'processing', 'shipped', 'delivered', 'cancelled').messages({
            'any.only': 'Statut de commande non valide.'
        }),
        isPaid: Joi.boolean(),
        paidAt: Joi.date().iso(),
        isDelivered: Joi.boolean(),
        deliveredAt: Joi.date().iso(),
        // D'autres champs pourraient être ajoutés ici si nécessaire pour la mise à jour
    }).min(1).messages({
        'object.min': 'Au moins un champ est requis pour la mise à jour.'
    });

    constructor() {
        this.model = orderModel; // Correction: utiliser directement le modèle importé
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

            const resPerPage = 4;
            const ordersCount = await this.model.countDocuments();
            const apiFeatures = new APIFeatures(this.model.find(), request.query)
                .search()
                .filter()
                .paginate();

            const orders = await apiFeatures.query;
            this.logger.logger.info("Orders retrieved successfully");
            response.status(200).json({
                success: true,
                count: orders.length,
                ordersCount,
                resPerPage,
                orders
            });
        } catch (error) {
            this.logger.logger.error("Error retrieving orders: " + error.message);
            next(new ErrorResponse("Error retrieving orders", 500));
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

            const order = await this.model.findById(request.params.id);
            if (!order) {
                this.logger.logger.error("Order not found");
                return next(new ErrorResponse("Order not found", 404));
            }
            this.logger.logger.info("Order retrieved successfully");
            response.status(200).json({
                success: true,
                order
            });
        } catch (error) {
            this.logger.logger.error("Error retrieving order: " + error.message);
            next(new ErrorResponse("Error retrieving order", 500));
        }
    };

    async create(request, response, next) {
        try {
            // Valider les données du corps de la requête
            const { error } = this.createSchema.validate(request.body);
            if (error) {
                this.logger.logger.error("Validation Error (Create Order Body): ", error.details);
                return next(new ErrorResponse(error.details[0].message, 400));
            }

            const order = await this.model.create(request.body);
            this.logger.logger.info("Order created successfully");
            response.status(201).json({
                success: true,
                order
            });
        } catch (error) {
            this.logger.logger.error("Error creating order: " + error.message);
            next(new ErrorResponse("Error creating order", 500));
        }
    };

    async update(request, response, next) {
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
                this.logger.logger.error("Validation Error (Update Order Body): ", bodyError.details);
                return next(new ErrorResponse(bodyError.details[0].message, 400));
            }

            const order = await this.model.findByIdAndUpdate(request.params.id, request.body, {
                new: true,
                runValidators: true,
                useFindAndModify: false
            });
            if (!order) {
                this.logger.logger.error("Order not found");
                return next(new ErrorResponse("Order not found", 404));
            }
            this.logger.logger.info("Order updated successfully");
            response.status(200).json({
                success: true,
                order
            });
        } catch(error) {
            this.logger.logger.error("Error updating order: " + error.message);
            next(new ErrorResponse("Error updating order", 500));
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

            const order = await this.model.findByIdAndDelete(request.params.id);
            if (!order) {
                this.logger.logger.error("Order not found");
                return next(new ErrorResponse("Order not found", 404));
            }
            this.logger.logger.info("Order deleted successfully");
            response.status(200).json({
                success: true,
                message: "Order deleted successfully"
            });
        } catch(error) {
            this.logger.logger.error("Error deleting order: " + error.message);
            next(new ErrorResponse("Error deleting order", 500));
        }
    }

}

export default Order;