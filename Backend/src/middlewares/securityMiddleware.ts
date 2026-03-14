
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import { Express, Request, Response, NextFunction } from 'express';

// 1. Rate Limiter for Login (Strict)
export const loginLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 10, // Max 10 attempts per IP (Relaxed for usability)
    message: {
        message: 'Demasiados intentos desde esta IP. Por seguridad, espera 10 minutos.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// 2. Rate Limiter for General API (Moderate)
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3000, // Increased to support polling (2s interval = ~450 reqs/15min + normal traffic)
    message: {
        message: 'Demasiadas solicitudes desde esta IP, por favor intente más tarde.'
    }
});

// 3. Rate Limiter for Chatbot (Strict - prevent API abuse)
export const chatbotLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // Max 50 messages per hour per IP
    message: {
        message: 'Has alcanzado el límite de consultas al asistente por esta hora. Intenta más tarde.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// 4. Global Security Configuration Function
export const configureSecurity = (app: Express) => {
    // A. Helmet (Secure Headers)
    app.use(helmet());

    // B. Mongo Sanitize (Prevent NoSQL Injection)
    app.use(mongoSanitize());

    // C. XSS Clean (Sanitize Body)
    // Using require because xss-clean might lack modern ESM types or export default issues sometimes
    const xss = require('xss-clean');
    app.use(xss());
};
