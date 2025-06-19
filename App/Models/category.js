import mongoose from 'mongoose';
import slugify from 'slugify';
import validator from 'validator';

/**
 * Schéma Mongoose pour les catégories.
 * Définit la structure des documents de catégorie dans la base de données MongoDB.
 */
const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Une catégorie doit avoir un nom'],
    unique: true,
    trim: true,
  },
  slug: String,
  description: {
    type: String,
    required: [true, 'Une catégorie doit avoir une description'],
    trim: true,
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères'],
  },
  image: {
    type: String,
    required: [true, 'Une catégorie doit avoir une image'],
    validate: [validator.isURL, 'L\'image doit être une URL valide'],
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

/**
 * Middleware pour créer un slug à partir du nom de la catégorie avant de l'enregistrer.
 */
categorySchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

const categoryModel = mongoose.model('Category', categorySchema);

export default categoryModel;
