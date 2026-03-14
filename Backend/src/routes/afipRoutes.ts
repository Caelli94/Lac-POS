import { Router } from 'express';
import { AfipController } from '../controllers/afipController';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure Multer for Certificate Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const orgId = req.params.orgId;
        const uploadPath = path.join(__dirname, '../../uploads/certs', orgId);

        // Ensure directory exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Force filename based on fieldname to avoid duplication issues
        // field 'cert' -> certificate.crt
        // field 'key' -> private_key.key
        const ext = path.extname(file.originalname);
        const name = file.fieldname === 'cert' ? 'certificate' : 'private_key';
        cb(null, `${name}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB Limit
    fileFilter: (req, file, cb) => {
        // Check Extension
        const ext = path.extname(file.originalname).toLowerCase();
        if (['.crt', '.key', '.pem'].includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid certificate file. Only .crt, .key, and .pem are allowed.'));
        }
    }
});

import { protect } from '../middlewares/authMiddleware';

// Routes
router.use(protect);

router.post('/upload-cert/:orgId', upload.fields([{ name: 'cert', maxCount: 1 }, { name: 'key', maxCount: 1 }]), AfipController.uploadCertificates);
router.put('/settings/:orgId', AfipController.updateSettings);
router.post('/invoice/:saleId', AfipController.emitInvoice);
router.get('/status/:orgId', AfipController.getServerStatus);
router.post('/generate-csr/:orgId', AfipController.generateCsr);

export default router;
