import { Router } from 'express';
import authRoutes from './auth.routes';
import roomRoutes from './room.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/rooms', roomRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
