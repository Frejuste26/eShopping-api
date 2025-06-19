import mongoose from 'mongoose';
import validator from 'validator';

/**
 * Schéma Mongoose pour les commandes.
 * Définit la structure des documents de commande dans la base de données MongoDB.
 */
const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Une commande doit appartenir à un utilisateur'],
    },
    items: [
      {
        product: {
          type: mongoose.Schema.ObjectId,
          ref: 'Product',
          required: [true, 'Un item de commande doit référencer un produit'],
        },
        variant: {
          type: mongoose.Schema.ObjectId,
          ref: 'ProductVariant',
        },
        quantity: {
          type: Number,
          required: [true, 'Un item de commande doit avoir une quantité'],
          min: [1, 'La quantité doit être au moins 1'],
        },
        price: {
          type: Number,
          required: [true, 'Un item de commande doit avoir un prix'],
        },
      },
    ],
    shippingAddress: {
      type: mongoose.Schema.ObjectId,
      ref: 'Address',
      required: [true, 'Une commande doit avoir une adresse de livraison'],
    },
    paymentMethod: {
      type: String,
      required: [true, 'Veuillez spécifier un mode de paiement'],
      enum: {
        values: ['card', 'paypal', 'bank_transfer'],
        message: 'Mode de paiement non supporté',
      },
    },
    paymentResult: {
      id: String,
      status: String,
      update_time: String,
      email_address: {
        type: String,
        validate: [validator.isEmail, 'Veuillez entrer une adresse email valide'],
      },
    },
    taxPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    shippingPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    totalPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    isPaid: {
      type: Boolean,
      required: true,
      default: false,
    },
    paidAt: {
      type: Date,
    },
    isDelivered: {
      type: Boolean,
      required: true,
      default: false,
    },
    deliveredAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * Middleware pour calculer le prix total de la commande avant de l'enregistrer.
 * Dépend des prix des articles commandés.
 */
orderSchema.pre('save', async function (next) {
  try {
    // Calculer le prix des articles
    const itemsPromises = this.items.map(async (item) => {
      const product = await mongoose.model('Product').findById(item.product);
      if (!product) {
        throw new Error(`Produit non trouvé pour l'article : ${item.product}`);
      }
      // Utiliser item.price si fourni, sinon utiliser le prix du produit
      const itemPrice = item.price !== undefined ? item.price : product.price;
      return item.quantity * itemPrice;
    });

    const itemsPrices = await Promise.all(itemsPromises);
    this.totalPrice =
      itemsPrices.reduce((acc, price) => acc + price, 0) +
      this.taxPrice +
      this.shippingPrice;

    next();
  } catch (error) {
    next(error); // Passer l'erreur au gestionnaire d'erreurs
  }
});

const orderModel = mongoose.model('Order', orderSchema);
export default orderModel;
