import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import multer from 'multer';
import {
    addChannelMember,
    createChannelMessage,
    createChannel,
    getChannel,
    getChannelMentionSuggestions,
    getChannelMessages,
    getChannels,
    getChannelUsers,
    joinChannel,
    uploadChannelFiles,
} from '../controllers/channels.controller.js';

const router = Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024, files: 5 },
});

router.use(authMiddleware);

router.get('/', getChannels);
router.post('/', createChannel);
router.get('/users', getChannelUsers);
router.get('/:channelId', getChannel);
router.post('/:channelId/join', joinChannel);
router.post('/:channelId/members', addChannelMember);
router.get('/:channelId/messages', getChannelMessages);
router.post('/:channelId/messages', createChannelMessage);
router.post('/:channelId/uploads', upload.array('files', 5), uploadChannelFiles);
router.get('/:channelId/mentions', getChannelMentionSuggestions);

export default router;
