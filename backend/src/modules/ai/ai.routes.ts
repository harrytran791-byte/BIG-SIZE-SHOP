import { Router } from 'express';
import { recommendSize } from './ai.controller';

const router = Router();

router.post('/recommend-size', recommendSize);

export default router;
