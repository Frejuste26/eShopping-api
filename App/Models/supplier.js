import mongoose from 'mongoose';
import validator from 'validator';

/**
 * Schéma Mongoose pour les fournisseurs.
 * Définit la structure des documents fournisseur dans la base de données MongoDB.
 */
const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Un fournisseur doit avoir un nom'],
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Un fournisseur doit avoir une description'],
    trim: true,
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères'],
  },
  image: {
    type: String,
    required: [true, 'Un fournisseur doit avoir une image'],
    validate: {
      validator: validator.isURL,
      message: 'L\'image doit être une URL valide',
    },
  },
}, {
  timestamps: true,
});

const supplierModel = mongoose.model('Supplier', supplierSchema);

export default supplierModel;
