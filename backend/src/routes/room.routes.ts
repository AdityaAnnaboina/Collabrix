import { Router } from 'express';
import { RoomController } from '../controllers/room.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/', requireAuth, RoomController.createRoom);
router.get('/:code', RoomController.getRoom);

export default router;
