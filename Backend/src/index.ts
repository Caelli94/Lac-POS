import app from './app';
import { connectDB } from './config/db';
import ticketSettingsRoutes from './routes/ticketSettingsRoutes';
import taskRoutes from './routes/taskRoutes';
import { initCronJobs } from './services/cronService';

// Force Restart V2
const PORT = process.env.PORT || 3001;

// Connect to Database
connectDB();

// Init Cron Jobs
try {
    initCronJobs();
} catch (error) {
    console.error('Failed to init cron jobs:', error);
}

app.listen(PORT as number, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
