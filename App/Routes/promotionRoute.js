import { Router } from "express";
import Promotion from "../Controllers/promotionController.js";

const router = new Router();
const promotionController = new Promotion();

router.get('/', promotionController.getAll.bind(promotionController))
  .post('/', promotionController.create.bind(promotionController))
  .get('/:id', promotionController.getOne.bind(promotionController))
  .put('/:id', promotionController.update.bind(promotionController))
  .delete('/:id', promotionController.delete.bind(promotionController));

export default router;