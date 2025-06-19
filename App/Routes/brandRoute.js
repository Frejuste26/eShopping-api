import { Router } from "express";
import Brand from "../Controllers/brandController.js";
import upload from '../Middlewares/uploadMiddleware.js';

const router = Router();
const brandController = new Brand();

router.get('/', brandController.getAll.bind(brandController))
   .get('/:id', brandController.getOne.bind(brandController))
   .post('/', upload.single('brandLogo'), brandController.create.bind(brandController))
   .put('/:id', upload.single('brandLogo'), brandController.update.bind(brandController))
   .delete('/:id', brandController.delete.bind(brandController));

export default router;