import { Router } from "express";
import User from "../Controllers/userController.js";

const router = new Router();
const userController = new User();

router.get('/', userController.getAll.bind(userController))
   .get('/:id', userController.getOne.bind(userController))
   .put('/:id', userController.update.bind(userController))
   .delete('/:id', userController.delete.bind(userController));

export default router;