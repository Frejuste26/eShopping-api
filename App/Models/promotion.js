import mongoose from 'mongoose';

/**
 * Schéma Mongoose pour les promotions.
 * Définit la structure des documents de promotion dans la base de données MongoDB.
 */
const promotionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Une promotion doit avoir un nom'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Le type de promotion est requis'],
      enum: {
        values: ['percentage', 'fixed'],
        message: 'Le type doit être soit "percentage" soit "fixed"',
      },
    },
    value: {
      type: Number,
      required: [true, 'La valeur de la promotion est requise'],
      validate: [
        {
          validator: function (val) {
            return this.type !== 'percentage' || (val > 0 && val <= 100);
          },
          message: 'Le pourcentage doit être entre 0 et 100',
        },
        {
          validator: function (val) {
            return this.type === 'percentage' || val > 0;
          },
          message: 'La valeur doit être supérieure à 0',
        },
      ],
    },
    productId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Product',
      required: [true, 'Une promotion doit être associée à un produit'],
    },
    startDate: {
      type: Date,
      required: [true, 'La date de début est requise'],
      validate: {
        validator: function (val) {
          return val >= new Date();
        },
        message: 'La date de début doit être dans le futur',
      },
    },
    endDate: {
      type: Date,
      required: [true, 'La date de fin est requise'],
      validate: {
        validator: function (val) {
          return val > this.startDate;
        },
        message: 'La date de fin doit être après la date de début',
      },
    },
    active: {
      type: Boolean,
      default: true,
    },
    minPurchase: {
      type: Number,
      min: [0, 'Le montant minimum d\'achat ne peut pas être négatif'],
      default: 0,
    },
    maxUsage: {
      type: Number,
      min: [1, 'Le nombre maximum d\'utilisations doit être au moins 1'],
    },
    currentUsage: {
      type: Number,
      default: 0,
    },
    conditions: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index pour améliorer les performances des requêtes
promotionSchema.index({ productId: 1, startDate: 1, endDate: 1 });
promotionSchema.index({ active: 1, endDate: 1 });

/**
 * Middleware de pré-sauvegarde pour mettre à jour l'état actif de la promotion
 */
promotionSchema.pre('save', function (next) {
  if (this.maxUsage && this.currentUsage >= this.maxUsage) {
    this.active = false;
  }
  next();
});

/**
 * Méthode pour vérifier si la promotion est valide
 * @returns {boolean} - Indique si la promotion est valide
 */
promotionSchema.methods.isValid = function () {
  const now = new Date();
  return (
    this.active &&
    now >= this.startDate &&
    now <= this.endDate &&
    (!this.maxUsage || this.currentUsage < this.maxUsage)
  );
};

/**
 * Méthode pour appliquer la promotion au prix
 * @param {number} price - Le prix auquel la promotion doit être appliquée
 * @returns {number} - Le prix après application de la promotion
 */
promotionSchema.methods.apply = function (price) {
  if (!this.isValid()) return price;

  if (this.type === 'percentage') {
    return price * (1 - this.value / 100);
  } else {
    return Math.max(0, price - this.value);
  }
};

/**
 * Méthode pour incrémenter le compteur d'utilisation de la promotion
 * @throws {Error} - Si le nombre maximal d'utilisations est atteint
 * @returns {Promise<void>}
 */
promotionSchema.methods.incrementUsage = async function () {
  if (this.maxUsage && this.currentUsage >= this.maxUsage) {
    throw new Error(
      'La promotion a atteint son nombre maximum d\'utilisations'
    );
  }
  this.currentUsage += 1;
  await this.save();
};

const Promotion = mongoose.model('Promotion', promotionSchema);

export default Promotion;
