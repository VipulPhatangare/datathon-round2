# Domain Setup Checklist for datathon.gfgpccoe.in

## Pre-Deployment DNS Configuration

### 1. Configure DNS Records
Before deploying, ensure these DNS records are set in your domain registrar:

```
Type    Name    Value                   TTL
A       @       YOUR_VPS_IP_ADDRESS    3600
A       www     YOUR_VPS_IP_ADDRESS    3600
```

**How to add:**
1. Log into your domain registrar (where you bought datathon.gfgpccoe.in)
2. Go to DNS Management / DNS Records
3. Add the A records pointing to your VPS IP address
4. Wait 10-30 minutes for DNS propagation

**Verify DNS propagation:**
```bash
# On your local machine
nslookup datathon.gfgpccoe.in
nslookup www.datathon.gfgpccoe.in
```

Both should return your VPS IP address.

---

## Configuration Files Updated ✅

The following files have been configured for **datathon.gfgpccoe.in**:

### ✅ Frontend Configuration
- **File:** `frontend/.env.production`
- **API URL:** `https://datathon.gfgpccoe.in/api`
- **Status:** Ready for build

### ✅ Backend Configuration
- **File:** `backend/.env.production` (newly created)
- **Frontend URL:** `https://datathon.gfgpccoe.in`
- **Status:** Ready for deployment
- **⚠️ ACTION REQUIRED:** Update the following in `.env.production`:
  - `JWT_SECRET` - Generate a strong secret
  - `MONGO_URI` - Verify MongoDB connection string
  - `EMAIL_USER` and `EMAIL_PASSWORD` - Add your email credentials

### ✅ Nginx Configuration
- **File:** `nginx.conf`
- **Server Name:** `datathon.gfgpccoe.in www.datathon.gfgpccoe.in`
- **Status:** Ready to deploy to `/etc/nginx/sites-available/`

### ✅ Deployment Documentation
- **File:** `DEPLOYMENT.md`
- **Domain References:** All updated to datathon.gfgpccoe.in
- **SSL Command:** Updated for your domain

---

## Deployment Steps Summary

### 1. Upload Files to VPS
```bash
# From your local machine (PowerShell)
scp -r "c:\Users\vipul\OneDrive\Desktop\web dev\Collage projects\datathon\*" root@YOUR_VPS_IP:/var/www/datathon/
```

### 2. Setup Backend
```bash
# On VPS
cd /var/www/datathon/backend

# Copy production env file
cp .env.production .env

# Install dependencies
npm install --production

# Create required directories
mkdir -p uploads assets
```

### 3. Setup Frontend
```bash
# On VPS
cd /var/www/datathon/frontend

# Install dependencies
npm install

# Build production version
npm run build
```

### 4. Deploy Nginx Configuration
```bash
# On VPS
sudo cp /var/www/datathon/nginx.conf /etc/nginx/sites-available/datathon
sudo ln -s /etc/nginx/sites-available/datathon /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Start Backend with PM2
```bash
# On VPS
cd /var/www/datathon
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 6. Setup SSL (HTTPS)
```bash
# On VPS
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d datathon.gfgpccoe.in -d www.datathon.gfgpccoe.in
```

### 7. Initialize Admin Account
```bash
# On VPS
cd /var/www/datathon/backend
curl -X POST http://localhost:4000/api/auth/init-admin
```

---

## Post-Deployment Verification

### Test HTTP Access (Before SSL)
```bash
curl -I http://datathon.gfgpccoe.in
```
Should return: `HTTP/1.1 200 OK`

### Test HTTPS Access (After SSL)
```bash
curl -I https://datathon.gfgpccoe.in
```
Should return: `HTTP/2 200`

### Test API Endpoint
```bash
curl https://datathon.gfgpccoe.in/api/competition
```
Should return competition data (JSON)

### Check PM2 Status
```bash
pm2 status
pm2 logs datathon-backend --lines 50
```

### Check Nginx Status
```bash
sudo systemctl status nginx
sudo nginx -t
```

### Check MongoDB Status
```bash
sudo systemctl status mongod
```

---

## Important Environment Variables to Configure

### Backend (.env)
```env
# REQUIRED - Generate a strong secret (use: openssl rand -base64 32)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# REQUIRED - Your MongoDB connection
MONGO_URI=mongodb://localhost:27017/datathon

# REQUIRED - Your email for password resets
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
EMAIL_FROM=noreply@datathon.gfgpccoe.in

# REQUIRED - Frontend URL for CORS
FRONTEND_URL=https://datathon.gfgpccoe.in

# Server configuration
PORT=4000
NODE_ENV=production
```

### Frontend (Built into .env.production - already configured ✅)
```env
VITE_API_URL=https://datathon.gfgpccoe.in/api
```

---

## Security Checklist

- [ ] DNS records pointing to VPS IP
- [ ] Firewall configured (SSH, HTTP, HTTPS)
- [ ] Strong JWT_SECRET generated
- [ ] MongoDB secured (localhost only)
- [ ] SSL certificate installed
- [ ] Email credentials configured
- [ ] Admin account password changed
- [ ] File upload size limits set (50MB)
- [ ] PM2 auto-restart enabled

---

## Troubleshooting

### Domain not accessible
```bash
# Check DNS
nslookup datathon.gfgpccoe.in

# Check Nginx
sudo nginx -t
sudo systemctl status nginx

# Check if port 80/443 is open
sudo netstat -tulpn | grep nginx
```

### API requests failing
```bash
# Check backend is running
pm2 status
pm2 logs datathon-backend

# Check backend port
curl http://localhost:4000/api/competition

# Check Nginx proxy
sudo tail -f /var/log/nginx/error.log
```

### SSL certificate issues
```bash
# Check certificate status
sudo certbot certificates

# Renew manually if needed
sudo certbot renew

# Check Nginx SSL config
sudo nginx -t
```

---

## Quick Reference Commands

```bash
# Restart everything
pm2 restart all
sudo systemctl restart nginx

# View logs
pm2 logs datathon-backend
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Update code and redeploy
cd /var/www/datathon
git pull  # if using git
cd frontend && npm run build
pm2 restart datathon-backend

# Check disk space
df -h

# Check memory usage
free -m

# Check MongoDB
sudo systemctl status mongod
mongo --eval "db.adminCommand('ping')"
```

---

## Support

For detailed step-by-step instructions, see: **DEPLOYMENT.md**

For any issues:
1. Check PM2 logs: `pm2 logs`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify DNS: `nslookup datathon.gfgpccoe.in`
4. Test backend locally: `curl http://localhost:4000/api/competition`
