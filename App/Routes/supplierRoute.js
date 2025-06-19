import { Router } from "express";
import Supplier from "../Controllers/supplierController.js";
import AuthMiddleware from "../Middlewares/authMiddleware.js";
import upload from '../Middlewares/uploadMiddleware.js';

const router = new Router();
const supplierController = new Supplier();

// Appliquer l'authentification à toutes les routes des fournisseurs
router.use(AuthMiddleware.authenticate);

router.get('/', supplierController.getAll.bind(supplierController));
router.get('/:id', supplierController.getOne.bind(supplierController));

// Seuls les admins et les magasiniers peuvent créer, mettre à jour ou supprimer des fournisseurs
router.post('/', AuthMiddleware.authorize(['admin', 'storekeeper']), upload.single('supplierImage'), supplierController.create.bind(supplierController));
router.put('/:id', AuthMiddleware.authorize(['admin', 'storekeeper']), upload.single('supplierImage'), supplierController.update.bind(supplierController));
router.delete('/:id', AuthMiddleware.authorize(['admin', 'storekeeper']), supplierController.delete.bind(supplierController));

export default router;