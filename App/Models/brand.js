import mongoose from 'mongoose';
import validator from 'validator';

/**
 * Schéma Mongoose pour les marques.
 * Définit la structure des documents de marque dans la base de données MongoDB.
 */
const brandSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Une marque doit avoir un nom'],
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Une marque doit avoir une description'],
    trim: true,
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères'],
  },
  logo: {
    type: String,
    required: [true, 'Une marque doit avoir un logo'],
    validate: [validator.isURL, 'Le logo doit être une URL valide'],
  },
  website: {
    type: String,
    trim: true,
    validate: [validator.isURL, 'Le site Web doit être une URL valide'],
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

const brandModel = mongoose.model('Brand', brandSchema);

export default brandModel;
