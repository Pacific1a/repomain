# 🚀 DUO Unified Server v2.0

Clean, professional implementation of the DUO server.

## 📋 Features

- ✅ Single server for Bot + Partner Site + Miniapp
- ✅ Clean architecture with services and routes
- ✅ SQLite database with proper schema
- ✅ JWT authentication for partners
- ✅ Webhook authentication for bot
- ✅ Rate limiting
- ✅ Security headers
- ✅ Proper error handling

## 📁 Structure

```
server/
├── config/
│   └── database.js         # Database connection and schema
├── middleware/
│   ├── auth.js             # JWT authentication
│   └── webhook.js          # Webhook authentication
├── services/
│   └── referral.service.js # Referral system logic
├── routes/
│   ├── auth.routes.js      # Login/register
│   └── referral.routes.js  # Referral API
├── data/
│   └── database.db         # SQLite database (auto-created)
├── .env                    # Environment variables
├── package.json            # Dependencies
└── server.js               # Main entry point
```

## 🔧 Installation

1. Install dependencies:
```bash
npm install
```

2. Configure `.env`:
```bash
PORT=3000
JWT_SECRET=your-secret-jwt-key
PARTNER_API_SECRET=e1e6547a80623ab936abfe561a8a0871
BOT_USERNAME=aasasdasdadsddasdbot
```

3. Run server:
```bash
npm start
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new partner
- `POST /api/auth/login` - Login partner
- `GET /api/auth/user` - Get current user (JWT required)

### Referral System (Webhook)
- `POST /api/referral/register` - Register click
- `POST /api/referral/register-referral` - First deposit
- `POST /api/referral/update-deposit` - Update deposit
- `POST /api/referral/add-earnings` - Add earnings

### Referral System (Partner Site)
- `GET /api/referral/partner/stats` - Get statistics
- `GET /api/referral/partner/stats/timeline` - Get timeline
- `GET /api/referral/partner/referrals` - Get referrals list

## 🔐 Security

- JWT tokens for partner authentication (7 days expiry)
- X-API-Secret header for webhook authentication
- Rate limiting (100 requests per 15 minutes)
- Helmet security headers
- CORS enabled

## 🚀 Deployment

See `../deploy/` directory for deployment scripts.

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 3000) |
| `NODE_ENV` | Environment | No (default: development) |
| `JWT_SECRET` | JWT secret key | Yes |
| `PARTNER_API_SECRET` | Webhook secret | Yes |
| `DATABASE_PATH` | SQLite database path | No (default: ./data/database.db) |
| `BOT_USERNAME` | Telegram bot username | Yes |

## 🐛 Debugging

Enable detailed logs:
```bash
NODE_ENV=development npm start
```

Health check:
```bash
curl http://localhost:3000/health
```

## 📊 Database Schema

### users
Partner accounts

### referral_stats
Overall statistics per partner

### referrals
List of referred users

### referral_events
Timeline events for charts

---

**Version:** 2.0.0  
**Author:** Senior Backend Developer  
**Date:** 2025-12-28
