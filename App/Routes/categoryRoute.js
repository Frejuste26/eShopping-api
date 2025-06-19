import { Router } from "express";
import Category from "../Controllers/categoryController.js";
import upload from '../Middlewares/uploadMiddleware.js';

const router = new Router();
const categoryController = new Category();

router.get('/', categoryController.getAll.bind(categoryController))
  .get('/:id', categoryController.getOne.bind(categoryController))
  .post('/', upload.single('categoryImage'), categoryController.create.bind(categoryController))
  .put('/:id', upload.single('categoryImage'), categoryController.update.bind(categoryController))
  .delete('/:id', categoryController.delete.bind(categoryController));

export default router;