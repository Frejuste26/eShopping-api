import { Router } from "express";
import Order from "../Controllers/orderController.js";

const router = new Router();
const orderController = new Order();

router.get('/', orderController.getAll.bind(orderController))
  .get('/:id', orderController.getOne.bind(orderController))
  .post('/', orderController.create.bind(orderController))
  .put('/:id', orderController.update.bind(orderController))
 .delete('/:id', orderController.delete.bind(orderController));

export default router;