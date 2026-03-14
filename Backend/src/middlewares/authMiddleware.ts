import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';

interface AuthRequest extends Request {
    user?: IUser;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
    let token;

    // 1. Check Authorization Header (Bearer)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    // 2. Check Cookie (HttpOnly)
    else if (req.headers.cookie) {
        const tokenCookie = req.headers.cookie.split(';').find(c => c.trim().startsWith('token='));
        if (tokenCookie) {
            token = tokenCookie.split('=')[1];
        }
    }

    if (token) {
        try {
            const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
            const user = await User.findById(decoded.id).select('-password').populate('organization').populate('roleId') as IUser;

            if (!user) {
                res.status(401).json({ message: 'User not found' });
                return;
            }

            // Single Session Enforcement
            // If the user has a sessionToken in DB, the token MUST match.
            // (New logins generate new DB tokens, invalidating old JWTs)
            if (user.sessionToken && decoded.sessionToken !== user.sessionToken) {
                console.log(`[SessionAuth] Mismatch! User: ${user.email}`);
                console.log(`[SessionAuth] DB Token: ${user.sessionToken}`);
                console.log(`[SessionAuth] JW Token: ${decoded.sessionToken}`);

                res.status(401).json({ message: 'Sesión expirada. Se ha iniciado sesión en otro dispositivo.' });
                return;
            }

            req.user = user;
            return next();
        } catch (error) {
            console.error('[AuthMiddleware] Token verification failed:', error);
            res.status(401).json({ message: 'Not authorized, token failed' });
            return;
        }
    }

    res.status(401).json({ message: 'Not authorized, no token' });
};

// RBAC Middleware
export const checkPermission = (moduleName: string, tabName?: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as AuthRequest).user;

        if (!user) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // 1. Super Admin / Admin Bypass
        if (user.role === 'superadmin' || user.role === 'admin') {
            return next();
        }

        // 2. Check Role & Permissions
        if (!user.roleId || !user.roleId.permissions) {
            return res.status(403).json({ message: 'Acceso denegado: Rol no configurado.' });
        }

        const modulePerm = user.roleId.permissions.find((p: any) => p.module === moduleName);

        if (!modulePerm) {
            return res.status(403).json({ message: `Acceso denegado al módulo ${moduleName}.` });
        }

        // 3. Tab/Action Check (Granular)
        if (tabName) {
            // Special handling for standard CRUD actions which are top-level boolean flags
            if (['create', 'edit', 'delete', 'view'].includes(tabName)) {
                if (!modulePerm[tabName]) {
                    return res.status(403).json({ message: `Acceso denegado: No tiene permiso para '${tabName}' en ${moduleName}.` });
                }
            } else {
                // Otherwise, treat it as a sub-tab lookup
                // Fix: Check by id, code, or name to be robust
                const tabPerm = modulePerm.tabs?.find((t: any) => t.id === tabName || t.code === tabName || t.name === tabName);
                if (!tabPerm || !tabPerm.enabled) {
                    return res.status(403).json({ message: `Acceso denegado: No tiene permiso para '${tabName}' en ${moduleName}.` });
                }
            }
        }

        next();
    };
};
