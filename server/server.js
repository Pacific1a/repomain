// ============================================
// DUO UNIFIED SERVER
// Clean implementation - Bot + Partner Site + Miniapp
// Version: 2.0.0
// ============================================

require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { db, initDatabase } = require('./config/database');

// ============================================
// GAMES
// ============================================

const { registerCrashHandlers } = require('./games/crash');
const { registerSpeedcashHandlers } = require('./games/speedcash');
const { registerRollHandlers } = require('./games/roll');
const { registerMinesHandlers } = require('./games/mines');
const { registerBlackjackHandlers } = require('./games/blackjack');
const { scheduleBotSpawn } = require('./games/fakePlayers');

// ============================================
// CONFIGURATION
// ============================================

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

console.log('');
console.log('========================================');
console.log('🚀 DUO UNIFIED SERVER');
console.log('========================================');
console.log(`📍 Port: ${PORT}`);
console.log(`🌍 Environment: ${NODE_ENV}`);
console.log(`🤖 Bot Username: @${process.env.BOT_USERNAME}`);
console.log('========================================');
console.log('');

// ============================================
// EXPRESS APP
// ============================================

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

// Экспортируем io для использования в других модулях (например referral withdraw)
module.exports.io = io;

// Trust proxy (for Nginx)
app.set('trust proxy', 1);

// Security middleware - relaxed CSP for Telegram WebApp
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for Telegram WebApp compatibility
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false
}));

// CORS
app.use(cors());

// Body parser
app.use(express.json());

// Rate limiting on API routes
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Увеличено с 100 до 500 запросов
    message: { success: false, message: 'Too many requests' },
    standardHeaders: true,
    legacyHeaders: false,
    // Исключить авторизованные endpoints партнёров из жёсткого лимита
    skip: (req) => {
        // Если есть токен авторизации - используем более мягкий лимит
        if (req.headers.authorization) {
            return false;
        }
        return false;
    }
});
app.use('/api/', apiLimiter);

// ============================================
// STATIC FILES
// ============================================

// Middleware to set correct Content-Type headers
app.use((req, res, next) => {
    if (req.url.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (req.url.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (req.url.endsWith('.json')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    next();
});

// Bot miniapp (served at /bot/)
const botDir = path.join(__dirname, '../bot');
app.use('/bot', express.static(botDir, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
        }
    }
}));
console.log('📁 Bot static files:', botDir);

// Partner site (served at /partner/)
const siteDir = path.join(__dirname, '../site');
app.use('/partner', express.static(siteDir, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
        }
    }
}));
console.log('📁 Partner site static files:', siteDir);

// Uploads
const uploadsDir = path.join(__dirname, '../site/uploads');
app.use('/uploads', express.static(uploadsDir));
console.log('📁 Uploads directory:', uploadsDir);

// ============================================
// API ROUTES
// ============================================

// Authentication routes
app.use('/api/auth', require('./routes/auth.routes'));
console.log('✅ Auth routes loaded');

// Referral system routes
app.use('/api/referral', require('./routes/referral.routes'));
console.log('✅ Referral routes loaded');

// Balance routes (for bot)
app.use('/api/balance', require('./routes/balance.routes'));
console.log('✅ Balance routes loaded');

// Transactions routes (for bot)
const transactionsRoutes = require('./routes/transactions.routes');
app.use('/api/transactions', transactionsRoutes);
// Set Socket.IO instance for transactions routes (will be called after io is created)
if (typeof transactionsRoutes.setIO === 'function') {
    transactionsRoutes.setIO(io);
}
console.log('✅ Transactions routes loaded');

// 2FA routes (stubs)
app.use('/api', require('./routes/auth.routes')); // Will handle /api/2fa/*
console.log('✅ 2FA routes loaded (stubs)');

// Withdrawal routes (manual payouts)
app.use('/api/withdrawal', require('./routes/withdrawal.routes'));
console.log('✅ Withdrawal routes loaded');

// Withdrawal admin routes (for bot)
app.use('/api/withdrawal', require('./routes/withdrawal-admin.routes'));
console.log('✅ Withdrawal admin routes loaded');

// Notifications routes
app.use('/api/notifications', require('./routes/notifications.routes'));
console.log('✅ Notifications routes loaded');

// Payments (CactusPay webhook)
app.use('/api/payments/cactuspay', require('./routes/payments.cactuspay.routes'));
console.log('✅ Payments routes loaded');

// Public config (safe subset for miniapp)
app.use('/api/public-config', require('./routes/public-config.routes'));
console.log('✅ Public config routes loaded');

// ============================================
// ROOT ROUTES
// ============================================

// Root - redirect to partner site
app.get('/', (req, res) => {
    res.redirect('/partner/');
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API status
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        server: 'DUO Unified Server',
        version: '2.0.0',
        timestamp: new Date().toISOString()
    });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'Endpoint not found' 
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        ...(NODE_ENV === 'development' && { error: err.message })
    });
});

// ============================================
// START SERVER
// ============================================

async function startServer() {
    try {
        // Initialize database
        await initDatabase();
        console.log('✅ Database ready');
        
        // Socket.IO connection handling
        io.on('connection', (socket) => {
            console.log('🔌 Socket.IO client connected:', socket.id);
            
            // Register game handlers
            registerCrashHandlers(socket, io);
            registerSpeedcashHandlers(socket, io);
            registerRollHandlers(socket, io);
            registerMinesHandlers(socket, io);
            registerBlackjackHandlers(socket, io);
            
            socket.on('disconnect', () => {
                console.log('❌ Socket.IO client disconnected:', socket.id);
            });
        });
        
        // Start bot scheduler for Roll game
        scheduleBotSpawn(io);
        console.log('✅ Game handlers registered');
        console.log('✅ Bot scheduler started');
        
        // Start listening
        server.listen(PORT, '0.0.0.0', () => {
            console.log('');
            console.log('========================================');
            console.log('✅ SERVER IS RUNNING');
            console.log('========================================');
            console.log(`🤖 Bot miniapp: http://localhost:${PORT}/bot/`);
            console.log(`👥 Partner site: http://localhost:${PORT}/partner/`);
            console.log(`🔌 API: http://localhost:${PORT}/api/`);
            console.log(`💚 Health: http://localhost:${PORT}/health`);
            console.log('========================================');
            console.log('');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.on('SIGTERM', () => {
    console.log('\n⏹️  SIGTERM signal received: closing HTTP server');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n⏹️  SIGINT signal received: closing HTTP server');
    process.exit(0);
});
