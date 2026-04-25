import { Router } from 'express';
import { getBackups, generateBackup, downloadBackup, restore, getRestoreHistory, getRestoreLogDetails, analyzeBackup, triggerDailyBackups } from '../controllers/backupController';
import { protect } from '../middlewares/authMiddleware';
import { backupLimiter } from '../middlewares/securityMiddleware';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const router = Router();

// Multer Config
// Multer Config
const uploadDir = path.join(__dirname, '../../uploads/temp');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({
    dest: uploadDir,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB Limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/gzip' ||
            file.mimetype === 'application/json' ||
            file.originalname.endsWith('.json.gz') ||
            file.originalname.endsWith('.json')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only .json and .json.gz are allowed.'));
        }
    }
});

// Apply Authentication Middleware to all routes
router.use(protect);

// List and Create Backups
router.get('/', getBackups);
router.post('/', backupLimiter, generateBackup);

// Download backup
router.get('/download/:filename', downloadBackup);

// Restore History
router.get('/restore-history', getRestoreHistory);
router.get('/restore-history/:id', getRestoreLogDetails);

// Analyze backup
router.post('/analyze', upload.single('backup'), analyzeBackup);

// Restore backup
router.post('/restore', upload.single('backup'), restore);

// Trigger daily backups (for external cron)
router.get('/trigger-daily', triggerDailyBackups);

export default router;
