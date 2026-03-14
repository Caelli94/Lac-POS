import { Request, Response } from 'express';
import { User } from '../models/User';
import bcrypt from 'bcryptjs';
import { Organization } from '../models/Organization';

// @desc    Get team members by Organization ID
// @route   GET /api/team/:organizationId
// @access  Private (Admin/Manager)
export const getTeamMembers = async (req: Request, res: Response) => {
    try {
        const { organizationId } = req.params;
        const users = await User.find({ organization: organizationId }).select('-password');

        console.log(`[Team] Fetching members for Org ${organizationId}. Found: ${users.length} users.`);
        users.forEach(u => console.log(` - User: ${u.email} (${u.name}) [Role: ${u.role}]`));

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Add a new team member
// @route   POST /api/team
// @access  Private (Admin)
export const addTeamMember = async (req: Request, res: Response) => {
    try {
        const { name, email, password, role, roleId, organizationId, isAuditManager } = req.body;

        // CHECK LIMITS
        const org = await Organization.findById(organizationId);
        if (org?.settings?.users_limit !== undefined && org.settings.users_limit !== -1) {
            // Count users in this org
            const currentCount = await User.countDocuments({ organization: organizationId });
            if (currentCount >= org.settings.users_limit) {
                return res.status(403).json({ message: 'LIMIT_REACHED_USERS' });
            }
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password manually if User model pre-save hook doesn't cover direct updates (it should cover create)
        // User.create triggers save middleware.
        const requester = (req as any).user;
        const requestedRole = role || 'user';

        // SECURITY: Privilege Escalation Prevention
        if (requestedRole === 'superadmin' && requester.role !== 'superadmin') {
            return res.status(403).json({
                message: 'Acceso Denegado: Solo un Super Admin puede crear otros Super Admins.'
            });
        }

        // Check if creating for another org (only superadmin can do that essentially, but allow tenant admins to create for their own)
        // If organizationId is different from requester's, verify requester is superadmin
        if (requester.role !== 'superadmin' && organizationId !== requester.organization?._id.toString() && organizationId !== requester.organization?.toString()) {
            return res.status(403).json({ message: 'No puedes crear usuarios para otra organización.' });
        }

        const user = await User.create({
            name,
            email,
            password,
            role: requestedRole,
            organization: organizationId,
            isAuditManager: !!isAuditManager
        });

        if (user) {
            res.status(201).json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                organization: user.organization
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update a team member
// @route   PUT /api/team/:id
// @access  Private (Admin)
export const updateTeamMember = async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            const requester = (req as any).user;

            // SECURITY: Check Role Update
            if (req.body.role) {
                if (req.body.role === 'superadmin' && requester.role !== 'superadmin') {
                    return res.status(403).json({ message: 'Acceso Denegado: No puedes ascender usuarios a Super Admin.' });
                }
                user.role = req.body.role;
            }

            // Handle Custom Role ID assignment
            if (req.body.roleId !== undefined) {
                user.roleId = req.body.roleId || undefined; // If null/empty string, set to undefined to clear ref
            }

            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;

            if (req.body.password) {
                user.password = req.body.password;
            }

            if (typeof req.body.isAuditManager !== 'undefined') {
                user.isAuditManager = !!req.body.isAuditManager;
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                roleId: updatedUser.roleId,
                organization: updatedUser.organization
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Remove a team member
// @route   DELETE /api/team/:id
// @access  Private (Admin)
export const removeTeamMember = async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            await User.findByIdAndDelete(req.params.id); // Permanently delete for now
            res.json({ message: 'User removed' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
