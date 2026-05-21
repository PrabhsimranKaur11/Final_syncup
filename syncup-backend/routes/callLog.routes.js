import express from 'express';
import protectRoute from '../middleware/auth.middleware.js';
import { logCallEvent, getChannelCallHistory } from '../controllers/callLog.controller.js';

const router = express.Router();

router.post('/calls/log', protectRoute, logCallEvent);
router.get('/channels/:channelId/calls', protectRoute, getChannelCallHistory);

export default router;
