import { Router } from "express";
import Authentication from "../Controllers/authController.js";

const router = new Router();
const authController = new Authentication();

router.post('/login', authController.login.bind(authController))
    .post('/register', authController.register.bind(authController))
    .post('/reset-password', authController.resetPassword.bind(authController))
    .get('/forgot-password', authController.forgotPassword.bind(authController))
    .get('/me', authController.getMe.bind(authController));

export default router;