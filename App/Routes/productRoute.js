import { Router } from "express";
import Product from '../Controllers/productController.js';
import upload from '../Middlewares/uploadMiddleware.js';

const router = Router();
const productController = new Product();

router.get('/', productController.getAll.bind(productController))
    .get('/:id', productController.getOne.bind(productController))
    .post('/', upload.single('productImage'), productController.create.bind(productController))
    .put('/:id', upload.single('productImage'), productController.update.bind(productController))
    .delete('/:id', productController.delete.bind(productController));

export default router;