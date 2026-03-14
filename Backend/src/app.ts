import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { configureSecurity, apiLimiter } from './middlewares/securityMiddleware';

const app = express();
// Force Restart for Backup Service Update

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// Security Layer (After body parsing for sanitization)
configureSecurity(app);
app.use('/api', apiLimiter);

// Import Routes
import authRoutes from './routes/authRoutes';
import orgRoutes from './routes/orgRoutes';
import cashRoutes from './routes/cashRoutes';
import salesRoutes from './routes/salesRoutes';
import supplierRoutes from './routes/supplierRoutes';
import branchRoutes from './routes/branchRoutes';
import ticketSettingsRoutes from './routes/ticketSettingsRoutes';
import productRoutes from './routes/productRoutes';
import categoryRoutes from './routes/categoryRoutes';
import purchaseRoutes from './routes/purchaseRoutes';
import customerRoutes from './routes/customerRoutes';
import priceListRoutes from './routes/priceLists';
import afipRoutes from './routes/afipRoutes';
import importRoutes from './routes/importRoutes';
import backupRoutes from './routes/backupRoutes';
import teamRoutes from './routes/teamRoutes';
import roleRoutes from './routes/roleRoutes';
import taskRoutes from './routes/taskRoutes';
import orderRoutes from './routes/orderRoutes';
import stockLotRoutes from './routes/stockLotRoutes';
import appointmentRoutes from './routes/appointmentRoutes';
import checkRoutes from './routes/checkRoutes';
import chatbotRoutes from './routes/chatbotRoutes';
import integrationRoutes from './routes/integrationRoutes';

app.get('/', (req, res) => {
    res.send('API is running...');
});

app.use('/api/auth', authRoutes);
app.use('/api/organizations', orgRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/ticket-settings', ticketSettingsRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/price-lists', priceListRoutes);
app.use('/api/afip', afipRoutes);
app.use('/api/import', importRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/stock-lots', stockLotRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/checks', checkRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/integrations', integrationRoutes);



export default app;
