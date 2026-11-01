import { Router } from 'express';
import { getProducts, getProductBySlug } from './product.controller';

const router = Router();

router.get('/', getProducts);
router.get('/:slug', getProductBySlug);

export default router;
