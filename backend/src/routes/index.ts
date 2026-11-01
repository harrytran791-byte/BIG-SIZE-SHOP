import { Router } from 'express';
import authRouter from '../modules/auth/auth.routes';
import adminRouter from '../modules/admin/admin.routes';
import managerRouter from '../modules/manager/manager.routes';
import userRouter from '../modules/user/user.routes';
import productRouter from '../modules/products/product.routes';
import orderRouter from '../modules/orders/order.routes';
import aiRouter from '../modules/ai/ai.routes';

const rootRouter = Router();

rootRouter.use('/auth', authRouter);
rootRouter.use('/admin', adminRouter);
rootRouter.use('/manager', managerRouter);
rootRouter.use('/user', userRouter);
rootRouter.use('/products', productRouter);
rootRouter.use('/orders', orderRouter);
rootRouter.use('/ai', aiRouter);

export default rootRouter;
