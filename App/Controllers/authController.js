import userModel from "../Models/user.js";
import AuthMiddleware from "../Middlewares/authMiddleware.js"
import ErrorResponse from "../Utils/errorResponse.js";
import Mailer from "../Utils/Mailer.js";
import Logger from "../Utils/Logger.js";
import Joi from 'joi';
import mongoose from 'mongoose';

class Authentication {
    constructor() {
        this.userModel = userModel;
        this.authMiddleware = AuthMiddleware;
        this.errorResponse = ErrorResponse;
        this.mailer = new Mailer();
        this.logger = new Logger();
    }

    // Validation schema pour l'enregistrement
    registerSchema = Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
    });

    // Validation schema pour la connexion
    loginSchema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
    });

    // Validation schema pour la demande de réinitialisation du mot de passe
    forgotPasswordSchema = Joi.object({
        email: Joi.string().email().required().messages({
            'string.email': 'L\'adresse e-mail doit être une adresse e-mail valide.',
            'any.required': 'L\'adresse e-mail est requise.'
        })
    });

    // Validation schema pour la réinitialisation du mot de passe
    resetPasswordSchema = Joi.object({
        password: Joi.string().min(6).required().messages({
            'string.min': 'Le mot de passe doit contenir au moins 6 caractères.',
            'any.required': 'Le mot de passe est requis.'
        })
    });

    // Validation schema pour le token de réinitialisation du mot de passe (paramètre de route)
    resetTokenSchema = Joi.object({
        resettoken: Joi.string().hex().length(64).required().messages({ // Assumant que le token hashé a une longueur de 64 caractères hexadécimaux
            'string.hex': 'Le token de réinitialisation doit être une chaîne hexadécimale.',
            'string.length': 'Le token de réinitialisation n\'a pas la longueur attendue.',
            'any.required': 'Le token de réinitialisation est requis.'
        })
    });

    /**
     * Enregistre un nouvel utilisateur.
     * @param {Object} request - L'objet de requête Express.
     * @param {Object} response - L'objet de réponse Express.
     * @param {function} next - La fonction next Express.
     * @returns {Promise<void>}
     */
    async register(request, response, next) {
        try {
            // Valider les données de la requête
            const { error } = this.registerSchema.validate(request.body);
            if (error) {
                this.logger.logger.error("Validation Error: ", error.details);
                return next(new ErrorResponse(error.details[0].message, 400));
            }

            const user = await this.userModel.create(request.body);
            const token = this.authMiddleware.generateToken(user._id);
            this.logger.logger.info("User registered successfully");
            response.status(201).json({
                success: true,
                token,
                user
            });
        } catch (err) {
            this.logger.logger.error("Error while registering user", err);
            next(err);
        }
    }

    /**
     * Connecte un utilisateur existant.
     * @param {Object} request - L'objet de requête Express.
     * @param {Object} response - L'objet de réponse Express.
     * @param {function} next - La fonction next Express.
     * @returns {Promise<void>}
     */
    async login(request, response, next) {
        try {
            // Valider les données de la requête
            const { error } = this.loginSchema.validate(request.body);
            if (error) {
                this.logger.logger.error("Validation Error: ", error.details);
                return next(new ErrorResponse(error.details[0].message, 400));
            }

            const { email, password } = request.body;
            const user = await this.userModel.findOne({ email }).select("+password");
            if (!user) {
                this.logger.logger.error("Invalid credentials");
                return next(new ErrorResponse("Invalid credentials", 401));
            }
            const isMatch = await user.matchPassword(password);
            if (!isMatch) {
                this.logger.logger.error("Invalid credentials");
                return next(new ErrorResponse("Invalid credentials", 401));
            }
            const token = this.authMiddleware.generateToken(user._id);
            this.logger.logger.info("User logged in successfully");
            response.status(200).json({
                success: true,
                token,
                user
            });
        } catch (err) {
            this.logger.logger.error("Error while logging in user", err);
            next(err);
        }
    }

    /**
     * Gestion de la demande de réinitialisation du mot de passe.
     * @param {Object} request - L'objet de requête Express.
     * @param {Object} response - L'objet de réponse Express.
     * @param {function} next - La fonction next Express.
     * @returns {Promise<void>}
     */
    async forgotPassword(request, response, next) {
        try {
            // Valider les données de la requête
            const { error: bodyError } = this.forgotPasswordSchema.validate(request.body);
            if (bodyError) {
                this.logger.logger.error("Validation Error (Forgot Password Body): ", bodyError.details);
                return next(new ErrorResponse(bodyError.details[0].message, 400));
            }

            const user = await this.userModel.findOne({ email: request.body.email });
            if (!user) {
                this.logger.logger.error("No user with that email");
                return next(new ErrorResponse("No user with that email", 404));
            }
            const resetToken = user.getResetPasswordToken();
            // Start a Mongoose session for the transaction
            const session = await mongoose.startSession();
            session.startTransaction();
            try {
                await user.save({ validateBeforeSave: false, session }); // Pass the session here
                const resetUrl = `${request.protocol}://${request.get("host")}/api/v1/auth/resetpassword/${resetToken}`;
                const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;
                this.logger.logger.info("Data passed to mailer.send:", {
                    email: user.email,
                    subject: "Password Reset Token",
                    message: message
                });
                await this.mailer
                    .setRecipient(user.email, user.name)
                    .setUrl(resetUrl)
                    .send('reset', 'Password Reset Token', {
                        message: message
                    });
                this.logger.logger.info("Email sent");
                await session.commitTransaction(); // Commit the transaction
                response.status(200).json({
                    success: true,
                    data: "Email sent"
                });
            } catch (err) {
                // If there's an error, abort the transaction and undo any changes that might have happened
                await session.abortTransaction();
                this.logger.logger.error("Error sending email or saving token", err);
                return next(new ErrorResponse("Email could not be sent", 500)); // Keep the 500 status
            } finally {
                session.endSession(); // Clean up the session
            }
        } catch (err) {
            this.logger.logger.error("Error while handling forgot password", err);
            next(err);
        }
    }

    /**
     * Réinitialise le mot de passe d'un utilisateur.
     * @param {Object} request - L'objet de requête Express.
     * @param {Object} response - L'objet de réponse Express.
     * @param {function} next - La fonction next Express.
     * @returns {Promise<void>}
     */
    async resetPassword(request, response, next) {
        try {
            // Valider le token de la requête (paramètres de route)
            const { error: paramsError } = this.resetTokenSchema.validate(request.params);
            if (paramsError) {
                this.logger.error("Validation Error (Reset Token Params): ", paramsError.details);
                return next(new ErrorResponse(paramsError.details[0].message, 400));
            }

            // Valider le nouveau mot de passe (corps de la requête)
            const { error: bodyError } = this.resetPasswordSchema.validate(request.body);
            if (bodyError) {
                this.logger.error("Validation Error (Reset Password Body): ", bodyError.details);
                return next(new ErrorResponse(bodyError.details[0].message, 400));
            }

            const resetPasswordToken = crypto.createHash("sha256").update(request.params.resettoken).digest("hex");
            const user = await this.userModel.findOne({
                resetPasswordToken,
                resetPasswordExpire: { $gt: Date.now() }
            });
            if (!user) {
                this.logger.error("Invalid Token");
                return next(new ErrorResponse("Invalid Token", 400));
            }
            user.password = request.body.password;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
             // Start a Mongoose session for the transaction
            const session = await mongoose.startSession();
            session.startTransaction();
            try{
                await user.save({session});
                await session.commitTransaction();
                this.logger.info("Password reset successfully");
                response.status(200).json({
                    success: true,
                    data: "Password reset successfully"
                });
            } catch(error){
                await session.abortTransaction();
                this.logger.error("Error while resetting password", error);
                next(error);
            } finally {
                session.endSession();
            }
        } catch (err) {
            this.logger.error("Error while resetting password", err);
            next(err);
        }
    }

    /**
     * Récupère les données de l'utilisateur connecté.
     * @param {Object} request - L'objet de requête Express.
     * @param {Object} response - L'objet de réponse Express.
     * @param {function} next - La fonction next Express.
     * @returns {Promise<void>}
     */
    async getMe(request, response, next) {
        try {
            const user = await this.userModel.findById(request.user.id);
            this.logger.info("User found");
            response.status(200).json({
                success: true,
                data: user
            });
        } catch (err) {
            this.logger.error("Error while getting user", err);
            next(err);
        }
    }
}

export default Authentication;
