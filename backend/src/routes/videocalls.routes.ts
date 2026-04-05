import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import {
    startChannelVideoCall,
    joinChannelVideoCall,
    endChannelVideoCall,
    leaveChannelVideoCall,
    getChannelCallInfo,
    getChannelCallHistory,
    enableRecording,
    getUserCallStats,
} from '../controllers/videocalls.controller.js';
import {
    startCallLimiter,
    joinCallLimiter,
    getCallInfoLimiter,
    enableRecordingLimiter,
    endCallLimiter,
} from '../middlewares/rateLimiting.js';

const router = Router();

router.use(authMiddleware);

// Start a new video call in a channel
router.post('/:channelId/start-call', startCallLimiter, startChannelVideoCall);

// Join an existing video call
router.post('/:channelId/join-call', joinCallLimiter, joinChannelVideoCall);

// End the video call
router.post('/:channelId/end-call', endCallLimiter, endChannelVideoCall);

// Leave the video call
router.post('/:channelId/leave-call', leaveChannelVideoCall);

// Get active call information
router.get('/:channelId/call-info', getCallInfoLimiter, getChannelCallInfo);

// Get call history for a channel
router.get('/:channelId/history', getChannelCallHistory);

// Enable recording for a call
router.post('/:channelId/enable-recording', enableRecordingLimiter, enableRecording);

// Get user call statistics
router.get('/stats/user-stats', getUserCallStats);

export default router;
