import { Request, Response } from 'express';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// @desc    Generate 2FA Secret and QR Code
// @route   POST /api/auth/2fa/generate
// @access  Private (Super Admin Only enforced by route)
export const generate2FA = async (req: Request, res: Response) => {
    try {
        const user = await User.findById((req as any).user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const secret = speakeasy.generateSecret({
            length: 20,
            name: `LAC-POS (${user.email})`
        });

        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

        // Save secret temporarily or permanently? 
        // We save it but don't enable it untill verified.
        // Or we pass it to client and client sends it back to verify?
        // Better: Save it now, but 'twoFactorEnabled' remains false.

        user.twoFactorSecret = secret.base32;
        await user.save();

        res.json({
            secret: secret.base32,
            qrCodeUrl
        });
    } catch (error) {
        console.error('2FA Generate Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Verify 2FA Token and Enable
// @route   POST /api/auth/2fa/verify
// @access  Private
export const verify2FA = async (req: Request, res: Response) => {
    const { token } = req.body;
    const userId = (req as any).user._id;

    try {
        const user = await User.findById(userId).select('+twoFactorSecret');
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (!user.twoFactorSecret) {
            return res.status(400).json({ message: '2FA secret not generated' });
        }

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token,
            window: 1 // Allow 30s slack
        });

        if (verified) {
            user.twoFactorEnabled = true;

            // Generate Recovery Codes
            const codes = Array.from({ length: 10 }, () =>
                Math.random().toString(36).substring(2, 8).toUpperCase()
            );

            // Hash codes before saving
            const hashedCodes = await Promise.all(
                codes.map(code => bcrypt.hash(code, 10))
            );

            user.recoveryCodes = hashedCodes;
            await user.save();

            res.json({
                success: true,
                message: '2FA Enabled Successfully',
                recoveryCodes: codes // Send RAW codes once
            });
        } else {
            res.status(400).json({ message: 'Invalid Token' });
        }
    } catch (error) {
        console.error('2FA Verify Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Validate 2FA during Login (Exchange Temp Token)
// @route   POST /api/auth/2fa/validate
// @access  Public (Protected by Temp Token)
export const validate2FALogin = async (req: Request, res: Response) => {
    const { tempToken, token, recoveryCode } = req.body;

    if (!tempToken) {
        return res.status(400).json({ message: 'Missing temp token' });
    }

    try {
        // Decode temp token to get user ID
        // Note: In real world, verify signature. Here we trust standard verify.
        const decoded: any = jwt.verify(tempToken, process.env.JWT_SECRET as string);
        if (!decoded || !decoded.id || decoded.type !== '2fa-challenge') {
            return res.status(401).json({ message: 'Invalid or expired login session' });
        }

        const user = await User.findById(decoded.id).select('+twoFactorSecret +recoveryCodes');
        if (!user) return res.status(404).json({ message: 'User not found' });

        let isValid = false;

        if (recoveryCode) {
            // Check recovery codes
            if (user.recoveryCodes && user.recoveryCodes.length > 0) {
                for (let i = 0; i < user.recoveryCodes.length; i++) {
                    const isMatch = await bcrypt.compare(recoveryCode, user.recoveryCodes[i]);
                    if (isMatch) {
                        isValid = true;
                        // Remove used code
                        user.recoveryCodes.splice(i, 1);
                        await user.save();
                        break;
                    }
                }
            }
        } else {
            // Check TOTP
            isValid = speakeasy.totp.verify({
                secret: user.twoFactorSecret!,
                encoding: 'base32',
                token,
                window: 1
            });
        }

        if (isValid) {
            // Generate Real Session Token
            const sessionToken = jwt.sign(
                { id: user._id, role: user.role, organizationId: user.organization },
                process.env.JWT_SECRET as string,
                { expiresIn: '30d' }
            );

            // Set cookie if needed or return token
            // We follow existing login pattern
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                organization: user.organization,
                isAuditManager: user.isAuditManager,
                token: sessionToken,
            });

        } else {
            res.status(401).json({ message: recoveryCode ? 'Invalid Recovery Code' : 'Invalid 2FA Code' });
        }

    } catch (error) {
        console.error('2FA Validate Error:', error);
        res.status(401).json({ message: 'Session expired, please login again' });
    }
};

// @desc    Disable 2FA
// @route   POST /api/auth/2fa/disable
// @access  Private
export const disable2FA = async (req: Request, res: Response) => {
    const { password, token } = req.body; // Req password + 2FA to disable
    const userId = (req as any).user._id;

    try {
        const user = await User.findById(userId).select('+password +twoFactorSecret');
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (!await user.matchPassword(password)) {
            return res.status(401).json({ message: 'Incorrect password' });
        }

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret!,
            encoding: 'base32',
            token,
            window: 1
        });

        if (!verified) {
            return res.status(400).json({ message: 'Invalid 2FA Token' });
        }

        user.twoFactorEnabled = false;
        user.twoFactorSecret = undefined;
        user.recoveryCodes = undefined;
        await user.save();

        res.json({ message: '2FA Disabled' });

    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
