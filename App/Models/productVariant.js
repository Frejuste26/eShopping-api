import mongoose from 'mongoose';

/**
 * Schéma Mongoose pour les variantes de produit.
 * Définit la structure des documents de variante de produit dans la base de données MongoDB.
 */
const productVariantSchema = new mongoose.Schema({
  color: {
    type: String,
    required: [true, 'Une variante doit avoir une couleur'],
    trim: true,
    enum: {  
        values: ['Rouge', 'Vert', 'Bleu', 'Orange', 'Noire', 'Blanche', 'Bordeaux', 'Rose', 'Jaune', 'Marron', 'Beige', 'Gris', 'Violet', 'Multicolore'],
        message: 'Couleur non valide'
    }
  },
  size: {
    type: String,
    required: [true, 'Une variante doit avoir une taille'],
    trim: true,
    enum: {  
        values: ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
        message: 'Taille non valide'
    }
  },
  stock: {
    type: Number,
    required: [true, 'Une variante doit avoir un stock'],
    min: [0, 'Le stock ne peut pas être négatif'],
    default: 0,
  },
}, {
  timestamps: true,
  index: [
    {
      unique: true,
      fields: ['color', 'size'],
      message: 'Une variante avec cette couleur et cette taille existe déjà',
    },
  ],
});

const productVariantModel = mongoose.model('ProductVariant', productVariantSchema);

export default productVariantModel;
