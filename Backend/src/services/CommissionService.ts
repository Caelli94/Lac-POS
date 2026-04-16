import mongoose from 'mongoose';
import { CommissionRule, ICommissionRule } from '../models/CommissionRule';
import { Sale } from '../models/Sale';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { Organization } from '../models/Organization';

export class CommissionService {
    /**
     * Calculates the commission for a specific sale item based on rules and user context.
     */
    static async calculateCommission(
        organizationId: string,
        userId: string,
        conditions: {
            roleId?: string;
            categoryId?: string;
            paymentMethod?: string;
            priceListId?: string;
        },
        saleAmount: number,
        netProfit: number
    ): Promise<number> {
        // 1. Check if advanced commissions are enabled for the organization
        const org = await Organization.findById(organizationId);
        const isAdvancedEnabled = org?.features?.some(f => f.code === 'advanced_commissions' && f.is_enabled);
        
        if (!isAdvancedEnabled) {
            // Fallback to Role-based commission if not advanced
            return await this.calculateFallbackCommission(userId, saleAmount, netProfit);
        }

        // 2. Find all active rules for this organization, sorted by priority (lowest number = highest priority)
        const rules = await CommissionRule.find({
            organization_id: organizationId,
            active: true
        }).sort({ priority: 1 });

        // 3. Find the first matching rule
        let matchingRule: ICommissionRule | null = null;
        for (const rule of rules) {
            if (this.matchesConditions(rule, conditions)) {
                matchingRule = rule;
                break;
            }
        }

        if (!matchingRule) {
            return await this.calculateFallbackCommission(userId, saleAmount, netProfit);
        }

        // 4. Determine base value (Gross total or Net profit)
        const baseValue = matchingRule.action.base === 'gross' ? saleAmount : netProfit;
        let commissionValue = matchingRule.action.value;

        // 5. Apply Scales (Metas/Incentives) if applicable
        if (matchingRule.scales && matchingRule.scales.length > 0) {
            const monthlySales = await this.getCurrentMonthSales(userId);
            
            // Sort scales by threshold descending to find the highest reached
            const sortedScales = [...matchingRule.scales].sort((a, b) => b.threshold - a.threshold);
            for (const scale of sortedScales) {
                if (monthlySales >= scale.threshold) {
                    commissionValue = scale.value;
                    break;
                }
            }
        }

        // 6. Calculate final amount
        if (matchingRule.action.type === 'percentage') {
            return (baseValue * commissionValue) / 100;
        } else {
            return commissionValue; // Fixed amount
        }
    }

    /**
     * Fallback logic: Uses the User's Role commission settings.
     */
    private static async calculateFallbackCommission(userId: string, saleAmount: number, netProfit: number): Promise<number> {
        const user = await User.findById(userId).populate('roleId');
        if (!user || !user.roleId || !user.roleId.commission_info?.is_enabled) {
            return 0;
        }

        const info = user.roleId.commission_info;
        const baseValue = info.type === 'gross' ? saleAmount : netProfit;
        return (baseValue * (info.percentage || 0)) / 100;
    }

    /**
     * Checks if a rule's conditions match the given context.
     */
    private static matchesConditions(rule: ICommissionRule, context: any): boolean {
        const { conditions } = rule;

        // Match Role (if specified in rule)
        if (conditions.roles && conditions.roles.length > 0) {
            if (!context.roleId || !conditions.roles.some(id => id.toString() === context.roleId)) {
                return false;
            }
        }

        // Match Category (if specified in rule)
        if (conditions.categories && conditions.categories.length > 0) {
            if (!context.categoryId || !conditions.categories.some(id => id.toString() === context.categoryId)) {
                return false;
            }
        }

        // Match Payment Method (if specified in rule)
        if (conditions.payment_methods && conditions.payment_methods.length > 0) {
            if (!context.paymentMethod || !conditions.payment_methods.includes(context.paymentMethod)) {
                return false;
            }
        }

        // Match Price List (if specified in rule)
        if (conditions.price_lists && conditions.price_lists.length > 0) {
            if (!context.priceListId || !conditions.price_lists.includes(context.priceListId)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Calculates the total sales for the current month for a user.
     */
    private static async getCurrentMonthSales(userId: string): Promise<number> {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const result = await Sale.aggregate([
            {
                $match: {
                    performed_by: new mongoose.Types.ObjectId(userId),
                    date: { $gte: startOfMonth },
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$total_amount' }
                }
            }
        ]);

        return result.length > 0 ? result[0].total : 0;
    }
}
