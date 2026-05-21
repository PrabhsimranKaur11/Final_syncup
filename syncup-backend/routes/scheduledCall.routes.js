import express from 'express';
import protectRoute from '../middleware/auth.middleware.js';
import {
  createScheduledCall,
  listScheduledCalls,
  cancelScheduledCall,
} from '../controllers/scheduledCall.controller.js';

const router = express.Router();

router.post('/:workspaceId/scheduled-calls', protectRoute, createScheduledCall);
router.get('/:workspaceId/scheduled-calls', protectRoute, listScheduledCalls);
router.delete('/:workspaceId/scheduled-calls/:callId', protectRoute, cancelScheduledCall);

export default router;
