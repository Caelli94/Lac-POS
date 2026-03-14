import cron from 'node-cron';
import { CashSession, CashRegister, CashMovement } from '../models/Cash';
import { initBackupScheduler } from './backupService';

/**
 * Initializes all Cron Jobs
 */
export const initCronJobs = () => {
    // Schedule: Every day at 23:59 (59 23 * * *)
    cron.schedule('59 23 * * *', async () => {
        console.log('[CRON] Running Auto-Close Cash Sessions Job...');
        try {
            await autoCloseSessions();
        } catch (error) {
            console.error('[CRON] Error in Auto-Close Job:', error);
        }
    });

    // Backup Scheduler (Internal schedule is 03:00)
    initBackupScheduler();
};

/**
 * Logic to automatically close open sessions
 */
const autoCloseSessions = async () => {
    const openSessions = await CashSession.find({ status: 'open' });
    console.log(`[CRON] Found ${openSessions.length} open sessions to close.`);

    for (const session of openSessions) {
        try {
            // 1. Calculate Expected Balance
            const movements = await CashMovement.find({ session: session._id });

            let totalCashIn = 0;
            let totalCashOut = 0;

            for (const m of movements) {
                if (m.paymentMethod === 'Efectivo') {
                    if (m.type === 'SALE' || m.type === 'PAYMENT_RECEIVED' || m.type === 'IN') {
                        totalCashIn += m.amount;
                    } else {
                        totalCashOut += m.amount;
                    }
                }
            }

            const expectedBalance = session.openingBalance + totalCashIn - totalCashOut;

            // 2. Update Session
            session.status = 'closed';
            session.closingBalance = expectedBalance; // Assume perfect match
            session.expectedBalance = expectedBalance;
            session.closedAt = new Date();
            session.notes = 'Cierre automático por sistema (Fin del día)';
            // We leave closedBy empty or set to a system user if exists, currently undefined is fine or check Schema requirements.
            // Schema says closedBy is optional.

            await session.save();

            // 3. Update Register
            await CashRegister.findByIdAndUpdate(session.cashRegister, {
                status: 'closed',
                closingBalance: expectedBalance,
                closedAt: new Date()
            });

            console.log(`[CRON] Closed session ${session._id} for register ${session.cashRegister}`);

        } catch (err) {
            console.error(`[CRON] Failed to close session ${session._id}:`, err);
        }
    }
};
