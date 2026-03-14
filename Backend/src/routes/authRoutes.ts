import express from 'express';
import { registerUser, loginUser, getMe, setupPassword, updateUserSettings } from '../controllers/authController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

import { loginLimiter } from '../middlewares/securityMiddleware';

import { generate2FA, verify2FA, disable2FA, validate2FALogin } from '../controllers/auth2faController';

const router = express.Router();

router.post('/register', registerUser);
router.post('/setup-password', loginLimiter, setupPassword);
router.post('/login', loginLimiter, loginUser);

// 2FA Routes
router.post('/2fa/generate', protect, generate2FA);
router.post('/2fa/verify', protect, verify2FA);
router.post('/2fa/disable', protect, disable2FA);
router.post('/2fa/validate', loginLimiter, validate2FALogin);
router.post('/logout', (req, res) => {
    // Dynamic import to avoid circular dependency if needed, or just import
    const { logoutUser } = require('../controllers/authController');
    logoutUser(req, res);
});
router.get('/me', protect, getMe);
router.put('/settings', protect, checkPermission('personalization', 'edit'), updateUserSettings);

export default router;
