# Deployment Guide

This guide covers deploying Tapp to production.

## Architecture Overview

```
┌─────────────────┐
│  Telegram Bot   │
│   (@TappBot)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────┐
│  Backend API    │────▶│   MongoDB    │
│  (Node.js)      │     │   Database   │
└────────┬────────┘     └──────────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────┐
│   Mini App      │────▶│ TON Network  │
│   (React)       │     │  Blockchain  │
└─────────────────┘     └──────────────┘
```

## Option 1: Deploy to Railway (Recommended)

### Backend Deployment

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Initialize project**:
   ```bash
   railway init
   ```

4. **Add MongoDB**:
   ```bash
   railway add mongodb
   ```

5. **Set environment variables**:
   ```bash
   railway variables set TELEGRAM_BOT_TOKEN=your_token
   railway variables set TON_API_KEY=your_key
   railway variables set PLATFORM_WALLET_ADDRESS=your_address
   railway variables set JWT_SECRET=your_secret
   railway variables set NODE_ENV=production
   # ... set all other variables from .env.example
   ```

6. **Deploy**:
   ```bash
   railway up
   ```

7. **Get your backend URL**:
   ```bash
   railway domain
   ```

### WebApp Deployment

1. **Update environment**:
   ```bash
   cd webapp
   # Create .env.production
   echo "VITE_API_URL=https://your-railway-backend.up.railway.app/api" > .env.production
   ```

2. **Build**:
   ```bash
   npm run build
   ```

3. **Deploy to Vercel**:
   ```bash
   npm i -g vercel
   vercel --prod
   ```

4. **Update bot configuration**:
   - Update `WEBAPP_URL` in Railway backend environment
   - Update WebApp URL in BotFather

## Option 2: Deploy to Heroku

### Backend

1. **Install Heroku CLI**:
   ```bash
   npm install -g heroku
   ```

2. **Login**:
   ```bash
   heroku login
   ```

3. **Create app**:
   ```bash
   heroku create tapp-backend
   ```

4. **Add MongoDB**:
   ```bash
   heroku addons:create mongolab:sandbox
   ```

5. **Set config vars**:
   ```bash
   heroku config:set TELEGRAM_BOT_TOKEN=your_token
   heroku config:set TON_API_KEY=your_key
   heroku config:set PLATFORM_WALLET_ADDRESS=your_address
   heroku config:set JWT_SECRET=your_secret
   heroku config:set NODE_ENV=production
   # ... set all other variables
   ```

6. **Create Procfile**:
   ```bash
   echo "web: npm start" > Procfile
   ```

7. **Deploy**:
   ```bash
   git push heroku main
   ```

### WebApp

Same as Railway option - deploy to Vercel or Netlify.

## Option 3: Deploy to VPS (DigitalOcean, AWS EC2, etc.)

### Prerequisites
- Ubuntu 22.04 LTS server
- Domain name (optional but recommended)
- SSH access

### Setup Server

1. **Connect to server**:
   ```bash
   ssh root@your-server-ip
   ```

2. **Update system**:
   ```bash
   apt update && apt upgrade -y
   ```

3. **Install Node.js**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
   apt install -y nodejs
   ```

4. **Install MongoDB**:
   ```bash
   wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
   apt update
   apt install -y mongodb-org
   systemctl start mongod
   systemctl enable mongod
   ```

5. **Install PM2** (Process manager):
   ```bash
   npm install -g pm2
   ```

6. **Install Nginx** (Web server):
   ```bash
   apt install -y nginx
   ```

### Deploy Backend

1. **Clone repository**:
   ```bash
   cd /var/www
   git clone <your-repo-url> tapp
   cd tapp
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create .env file**:
   ```bash
   nano .env
   # Copy contents from .env.example and fill in values
   ```

4. **Build**:
   ```bash
   npm run build
   ```

5. **Start with PM2**:
   ```bash
   pm2 start dist/index.js --name tapp-backend
   pm2 save
   pm2 startup
   ```

### Deploy WebApp

1. **Build webapp**:
   ```bash
   cd webapp
   npm install
   npm run build
   ```

2. **Configure Nginx**:
   ```bash
   nano /etc/nginx/sites-available/tapp
   ```

   Add:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       # WebApp
       location / {
           root /var/www/tapp/webapp/dist;
           try_files $uri $uri/ /index.html;
       }

       # Backend API
       location /api {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Enable site**:
   ```bash
   ln -s /etc/nginx/sites-available/tapp /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   ```

4. **Setup SSL with Let's Encrypt**:
   ```bash
   apt install -y certbot python3-certbot-nginx
   certbot --nginx -d your-domain.com
   ```

### Setup Firewall

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## Docker Deployment

### Create Dockerfile

```dockerfile
# Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### Create docker-compose.yml

See `docker-compose.yml` in the root directory.

### Deploy with Docker

```bash
docker-compose up -d
```

## Post-Deployment Steps

### 1. Update Bot Configuration

1. Go to BotFather
2. Update WebApp URL with your deployed URL
3. Test the bot

### 2. Test the Integration

1. Send `/start` to your bot
2. Create a test channel
3. Add bot as admin
4. Create a test post
5. Try to unlock it with TON wallet

### 3. Monitor Logs

**Railway/Heroku**:
```bash
railway logs  # or heroku logs --tail
```

**VPS with PM2**:
```bash
pm2 logs tapp-backend
```

**Docker**:
```bash
docker-compose logs -f
```

### 4. Setup Monitoring

Consider using:
- [Sentry](https://sentry.io/) for error tracking
- [UptimeRobot](https://uptimerobot.com/) for uptime monitoring
- [LogRocket](https://logrocket.com/) for frontend monitoring

## Backup Strategy

### Database Backups

**Automated MongoDB backup**:
```bash
# Create backup script
cat > /usr/local/bin/backup-tapp.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/tapp"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
mongodump --db=tapp --out=$BACKUP_DIR/backup_$DATE
# Keep only last 7 days
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} \;
EOF

chmod +x /usr/local/bin/backup-tapp.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-tapp.sh
```

## Scaling Considerations

### Vertical Scaling
- Increase server resources (RAM, CPU)
- Use MongoDB indexes for better performance
- Enable Redis for caching

### Horizontal Scaling
- Use load balancer (Nginx, HAProxy)
- Deploy multiple backend instances
- Use MongoDB replica sets
- Separate bot process from API server

## Environment-Specific Configuration

### Development
```env
NODE_ENV=development
TON_NETWORK=testnet
LOG_LEVEL=debug
```

### Staging
```env
NODE_ENV=staging
TON_NETWORK=testnet
LOG_LEVEL=info
```

### Production
```env
NODE_ENV=production
TON_NETWORK=mainnet
LOG_LEVEL=warn
```

## Troubleshooting Deployment

### Issue: Bot not receiving updates
**Solution**: Check webhook status
```bash
curl https://api.telegram.org/bot<YOUR_TOKEN>/getWebhookInfo
```

### Issue: MongoDB connection fails
**Solution**: Check connection string and firewall rules
```bash
# Test MongoDB connection
mongosh "your_mongodb_uri"
```

### Issue: TON payments not verifying
**Solution**:
- Verify TON_API_KEY is valid
- Check TON network status
- Ensure PLATFORM_WALLET_ADDRESS is correct

### Issue: CORS errors in WebApp
**Solution**: Add proper CORS configuration in backend
```typescript
app.use(cors({
  origin: process.env.WEBAPP_URL,
  credentials: true
}));
```

## Security Checklist

- [ ] Environment variables are set correctly
- [ ] Bot token is kept secret
- [ ] JWT secret is strong and random
- [ ] HTTPS is enabled
- [ ] Database has authentication enabled
- [ ] Firewall rules are configured
- [ ] Rate limiting is enabled
- [ ] Input validation is in place
- [ ] Admin IDs are restricted
- [ ] Logs don't contain sensitive data

## Cost Estimation

### Free Tier
- Railway: $5/month (includes MongoDB)
- Vercel: Free for hobby projects
- **Total**: ~$5/month

### Small Scale (< 1000 users)
- Railway: $10-20/month
- MongoDB Atlas: $9/month (M2)
- Vercel: Free
- **Total**: ~$20-30/month

### Medium Scale (1000-10000 users)
- Railway/Heroku: $25-50/month
- MongoDB Atlas: $57/month (M10)
- Vercel: Free or $20/month
- **Total**: ~$80-130/month

### Large Scale (10000+ users)
- VPS: $40-100/month
- MongoDB Atlas: $150+/month
- CDN: $20-50/month
- **Total**: $200-300+/month

---

For more help, open an issue on GitHub or contact support.
