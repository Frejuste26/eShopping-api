import jwt from 'jsonwebtoken';
import User from '../Models/user.js';
import Logger from '../Utils/Logger.js';

class AuthMiddleware {
  /**
   * Middleware de vérification du token JWT
   */
  static authenticate = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer <token>

    if (!token) {
      Logger.warn('Tentative d\'accès non autorisée - Token manquant', {
        ip: req.ip,
        path: req.originalUrl,
      });
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentification requise',
        },
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Vérification que l'utilisateur existe toujours
      const user = await User.findByPk(decoded._id, {
        attributes: ['userId', 'username', 'role', 'lastLogin'],
      });

      if (!user) {
        Logger.warn('Token valide mais utilisateur inexistant', {
          userId: decoded.userId,
        });
        return res.status(401).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Compte utilisateur introuvable',
          },
        });
      }

      // Ajout des informations utilisateur à la requête
      req.auth = {
        userId: user.userId,
        username: user.username,
        role: user.role,
      };

      // Mise à jour de la date de dernière connexion
      user.lastLogin = new Date();
      await user.save();

      // Log de l'authentification réussie
      Logger.info('Authentification réussie', {
        userId: user.userId,
        ip: req.ip,
        path: req.originalUrl,
      });
      next();
    } catch (error) {
      Logger.error('Échec de l\'authentification', {
        error: error.message,
        token: token.substring(0, 10) + '...', // Log partiel pour sécurité
      });

      let errorMessage = 'Token invalide';
      if (error.name === 'TokenExpiredError') {
        errorMessage = 'Token expiré';
      } else if (error.name === 'JsonWebTokenError') {
        errorMessage = 'Token malformé';
      }

      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: errorMessage,
        },
      });
    }
  };

  /**
   * Middleware de vérification du rôle de l'utilisateur
   * @param {string[]} requiredRoles - Les rôles requis
   * @param {object} options - Options supplémentaires
   * @param {boolean} options.ownershipRequired - Indique si la propriété est requise
   * @param {string} options.ownerField - Le champ contenant l'ID du propriétaire
   * @param {function} options.isOwner - Fonction de vérification personnalisée de la propriété
   */
  static authorize = (requiredRoles = [], options = {}) => {
    return async (req, res, next) => {
      try {
        // Vérification basique des rôles
        if (requiredRoles.length > 0 && !requiredRoles.includes(req.auth.role)) {
          Logger.warn('Tentative d\'accès non autorisée - Rôle insuffisant', {
            userId: req.auth.userId,
            requiredRoles,
            actualRole: req.auth.role,
            path: req.originalUrl,
          });

          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Permissions insuffisantes pour cette action',
            },
          });
        }

        // Vérification supplémentaire si la propriété est requise
        if (options.ownershipRequired) {
          const ownerField = options.ownerField || 'userId'; // Default to 'userId'
          const isOwner = options.isOwner;
          let isOwnerAuthorized = false;

          if (isOwner && typeof isOwner === 'function') {
            // Utilisation de la fonction de vérification personnalisée
            isOwnerAuthorized = await isOwner(req.auth, req.params.id); // Pass id
          } else {
            // Vérification standard de la propriété
            const resource = await options.model.findByPk(req.params.id);
            if (resource && resource[ownerField] === req.auth.userId) {
              isOwnerAuthorized = true;
            }
          }
          if (!isOwnerAuthorized) {
            Logger.warn(
              'Tentative d\'accès non autorisée - Propriété requise',
              {
                userId: req.auth.userId,
                path: req.originalUrl,
              }
            );
            return res.status(403).json({
              success: false,
              error: {
                code: 'OWNERSHIP_REQUIRED',
                message:
                  'Vous devez être propriétaire de cette ressource pour effectuer cette action',
              },
            });
          }
        }

        next();
      } catch (error) {
        Logger.error('Erreur lors de l\'autorisation', {
          error: error.message,
          userId: req.auth?.userId,
        });
        res.status(500).json({
          success: false,
          error: {
            code: 'AUTHORIZATION_ERROR',
            message:
              'Erreur lors de la vérification des permissions',
          },
        });
      }
    };
  };

  /**
   * Génère un token JWT
   */
  static generateToken(user) {
    return jwt.sign(
      {
        userId: user.userId,
        role: user.role,
        iss: process.env.JWT_ISSUER || 'eshopping-api',
        aud: process.env.JWT_AUDIENCE || 'eshopping-client',
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '1d',
        algorithm: 'HS256',
      }
    );
  }
}

export default AuthMiddleware;
