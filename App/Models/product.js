import mongoose from 'mongoose';
import slugify from 'slugify';
import validator from 'validator';

/**
 * Schéma Mongoose pour les produits.
 * Définit la structure des documents de produit dans la base de données MongoDB.
 */
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Un produit doit avoir un nom'],
      unique: true,
      trim: true,
    },
    slug: String,
    description: {
      type: String,
      required: [true, 'Un produit doit avoir une description'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Le prix est requis'],
      min: [0, 'Le prix ne peut pas être négatif'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          return !this.price || val < this.price;
        },
        message: 'Le prix soldé ({VALUE}) doit être inférieur au prix régulier',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'La note doit être supérieure ou égale à 1.0'],
      max: [5, 'La note doit être inférieure ou égale à 5.0'],
      set: (val) => Math.round(val * 10) / 10, // Arrondir à une décimale
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    category: {
      type: mongoose.Schema.ObjectId,
      ref: 'Category',
      required: [true, 'Un produit doit appartenir à une catégorie'],
    },
    brand: {
      type: mongoose.Schema.ObjectId,
      ref: 'Brand',
    },
    variants: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'ProductVariant',
      },
    ],
    stock: {
      type: Number,
      required: [true, 'Le stock est requis'],
      min: [0, 'La quantité en stock ne peut pas être négative'],
      default: 0,
    },
    image: [
      {
        type: String,
        validate: [validator.isURL, 'L\'image doit être une URL valide'],
      },
    ],
    rating: {
      type: Number,
      default: 0, // Note par défaut
      min: [0, 'La note ne peut pas être inférieure à 0'],
      max: [5, 'La note ne peut pas dépasser 5'],
    },
    numReviews: {
      type: Number,
      default: 0, // Nombre d'avis par défaut
    },
    isAvailable: {
      type: Boolean,
      default: true,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index pour améliorer les performances des requêtes
productSchema.index({ price: 1, ratingsAverage: -1 });
productSchema.index({ slug: 1 });

/**
 * Middleware pour créer un slug à partir du nom du produit avant de l'enregistrer.
 */
productSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

/**
 * Middleware pour peupler automatiquement les références (brand, category, variants)
 * lors des requêtes find.
 */
productSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'brand',
    select: 'name logo',
  })
    .populate({
      path: 'category',
      select: 'name image',
    })
    .populate({
      path: 'variants',
      select: '-__v',
    });
  next();
});

/**
 * Applique une logique pour assurer la cohérence entre les champs isAvailable et stock.
 * Ce middleware est exécuté avant d'enregistrer ou de mettre à jour un produit.
 */
productSchema.pre('save', function (next) {
  if (this.stock === 0) {
    this.isAvailable = false;
  } else if (this.stock > 0 && this.isAvailable === false) {
    this.isAvailable = true; // Rétablir la disponibilité si le stock est > 0 et isAvailable est false
  }
  next();
});

// Exporter le modèle
const productModel = mongoose.model('Product', productSchema);

export default productModel;
