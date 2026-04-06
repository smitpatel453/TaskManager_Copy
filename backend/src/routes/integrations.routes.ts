import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { getSlackAuthUrl, handleSlackCallback, getSlackChannels } from '../controllers/integrations.controller.js';

const router = Router();

// Endpoint to hit from frontend when user clicks "Connect to Slack"
router.get('/slack/auth', authMiddleware, getSlackAuthUrl);

// Public callback endpoint that Slack redirects to
router.get('/slack/callback', handleSlackCallback);

// Endpoint to fetch slack channels from API after authorization
router.get('/slack/channels', authMiddleware, getSlackChannels);

export default router;
