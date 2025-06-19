import { Router } from 'express';
import productRoutes from './productRoute.js';
import brandRoutes from './brandRoute.js';
import categoryRoutes from './categoryRoute.js';
import authRoutes from './authRoute.js';
import userRoutes from './userRoute.js';
import orderRoutes from './orderRoute.js';
import promotionRoutes from './promotionRoute.js';
import supplierRoutes from './supplierRoute.js';

const router = Router();

router.use('/products', productRoutes);
router.use('/brands', brandRoutes);
router.use('/categories', categoryRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/orders', orderRoutes);
router.use('/promotions', promotionRoutes);
router.use('/suppliers', supplierRoutes);


export default router;