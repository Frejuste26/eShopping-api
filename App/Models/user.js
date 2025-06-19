import mongoose from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcrypt';

/**
 * Schéma utilisateur pour la base de données MongoDB.
 * Définit la structure des documents utilisateur, incluant le nom, l'email,
 * le mot de passe, le rôle et l'état du compte.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Le nom est requis"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Veuillez entrer votre email'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Veuillez entrer un email valide'],
      index: true, // Index pour optimiser les requêtes par email
    },
    password: {
      type: String,
      required: [true, 'Veuillez entrer un mot de passe'],
      minlength: 8,
      select: false, // Ne pas inclure par défaut dans les résultats de requête
    },
    role: {
      type: String,
      enum: ["client", "admin", "storekeeper"],
      default: "client",
      index: true, // Index pour optimiser les requêtes par rôle
    },
    isActive: {
      type: Boolean,
      default: true,
      select: false, // Ne pas inclure par défaut dans les résultats de requête
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true, // Ajoute createdAt et updatedAt
  }
);

/**
 * Middleware pour hasher le mot de passe avant de sauvegarder un nouvel utilisateur
 * ou de modifier un mot de passe existant.
 */
userSchema.pre('save', async function (next) {
  // Hash le mot de passe uniquement s'il a été modifié
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    return next(error); // Passer l'erreur au gestionnaire d'erreurs
  }
});

/**
 * Méthode pour vérifier si le mot de passe fourni correspond au mot de passe haché
 * stocké dans la base de données.
 * @param {string} candidatePassword - Le mot de passe en texte clair à vérifier.
 * @returns {Promise<boolean>} - Une promesse qui résout à true si le mot de passe
 *                                correspond, false sinon.
 */
userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
  return bcrypt.compare(candidatePassword, userPassword);
};

// Crée le modèle User à partir du schéma
const userModel = mongoose.model('User', userSchema);

export default userModel;
