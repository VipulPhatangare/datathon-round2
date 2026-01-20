# DATATHON - Hostinger VPS Deployment Guide

## Prerequisites on VPS
- Ubuntu 20.04+ or similar Linux distribution
- Root or sudo access
- Domain name pointed to your VPS IP

## Step 1: Connect to VPS
```bash
ssh root@your-vps-ip
# Or with custom SSH port
ssh -p YOUR_PORT root@your-vps-ip
```

## Step 2: Install Required Software

### Install Node.js (v18+)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # Verify installation
```

### Install MongoDB
```bash
# Import MongoDB GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Update and install
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
sudo systemctl status mongod
```

### Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

### Install Nginx (Web Server)
```bash
sudo apt update
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Install Git
```bash
sudo apt install -y git
```

## Step 3: Setup Application

### Create application directory
```bash
mkdir -p /var/www/datathon
cd /var/www/datathon
```

### Clone or upload your code
**Option A: Using Git (if you have a repository)**
```bash
git clone YOUR_REPO_URL .
```

**Option B: Upload via SCP from your local machine**
```bash
# Run this from your LOCAL machine (PowerShell):
scp -r "c:\Users\vipul\OneDrive\Desktop\web dev\Collage projects\datathon\*" root@YOUR_VPS_IP:/var/www/datathon/
```

**Option C: Upload via FTP using FileZilla**
- Connect to your VPS
- Upload entire datathon folder to `/var/www/datathon`

## Step 4: Setup Backend

### Install dependencies
```bash
cd /var/www/datathon/backend
npm install --production
```

### Create production .env file
```bash
nano .env
```

Paste this configuration (update values):
```env
# MongoDB
MONGO_URI=mongodb://localhost:27017/datathon

# JWT Secret (generate new one)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Email Configuration (Gmail)
EMAIL_USER=geeksforgeeks@pccoepune.org
EMAIL_PASS=your-gmail-app-password

# Server
PORT=4000
NODE_ENV=production

# Frontend URL (your domain)
FRONTEND_URL=https://yourdomain.com
```

Save: `Ctrl+X`, then `Y`, then `Enter`

### Create uploads and assets directories
```bash
mkdir -p uploads assets
```

### Upload your logo
Upload `gfg_logo.png` to `/var/www/datathon/backend/assets/`

### Initialize admin account
```bash
node server.js &
# Wait 3 seconds for server to start
sleep 3
curl -X POST http://localhost:4000/api/auth/init-admin
# Kill the temporary server
pkill -f "node server.js"
```

## Step 5: Setup Frontend

### Install dependencies and build
```bash
cd /var/www/datathon/frontend
npm install
```

### Update API URL
```bash
nano src/api.js
```

Change the baseURL to your domain:
```javascript
const api = axios.create({
  baseURL: 'https://yourdomain.com/api',
  // ... rest of config
});
```

### Build production version
```bash
npm run build
```

This creates `dist` folder with optimized files.

## Step 6: Configure PM2 (Keep Backend Running)

### Create PM2 ecosystem file
```bash
cd /var/www/datathon
nano ecosystem.config.js
```

Paste:
```javascript
module.exports = {
  apps: [{
    name: 'datathon-backend',
    script: './backend/server.js',
    cwd: '/var/www/datathon/backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    }
  }]
};
```

### Start application with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Useful PM2 commands
```bash
pm2 status          # Check status
pm2 logs            # View logs
pm2 restart all     # Restart
pm2 stop all        # Stop
pm2 delete all      # Remove from PM2
```

## Step 7: Configure Nginx (Reverse Proxy)

### Create Nginx configuration
```bash
sudo nano /etc/nginx/sites-available/datathon
```

Paste this configuration (replace `yourdomain.com`):
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend (React build)
    root /var/www/datathon/frontend/dist;
    index index.html;

    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Socket.io WebSocket
    location /socket.io {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # File upload size limit
    client_max_body_size 50M;
}
```

### Enable the site
```bash
sudo ln -s /etc/nginx/sites-available/datathon /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

## Step 8: Setup SSL (HTTPS) with Let's Encrypt

### Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Get SSL certificate
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow prompts:
- Enter email
- Agree to terms
- Choose redirect HTTP to HTTPS (option 2)

### Auto-renewal test
```bash
sudo certbot renew --dry-run
```

SSL certificates auto-renew every 90 days.

## Step 9: Configure Firewall

```bash
# Allow SSH
sudo ufw allow OpenSSH

# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Enable firewall
sudo ufw enable
sudo ufw status
```

## Step 10: Setup MongoDB Authentication (Recommended)

```bash
mongosh

use admin
db.createUser({
  user: "datathon_admin",
  pwd: "your-secure-password",
  roles: ["readWriteAnyDatabase", "dbAdmin"]
})

exit
```

Update `.env`:
```env
MONGO_URI=mongodb://datathon_admin:your-secure-password@localhost:27017/datathon?authSource=admin
```

Restart backend:
```bash
pm2 restart all
```

## Maintenance Commands

### Update application
```bash
cd /var/www/datathon
git pull  # If using git
cd backend && npm install
cd ../frontend && npm install && npm run build
pm2 restart all
sudo systemctl restart nginx
```

### View logs
```bash
# Backend logs
pm2 logs datathon-backend

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log
```

### Backup MongoDB
```bash
mongodump --db datathon --out /backups/$(date +%Y%m%d)
```

### Monitor resources
```bash
htop           # System resources
pm2 monit      # PM2 monitoring
df -h          # Disk space
free -h        # Memory
```

## Troubleshooting

### Backend not starting
```bash
pm2 logs datathon-backend  # Check error logs
pm2 restart all
```

### Frontend not loading
```bash
# Check Nginx
sudo nginx -t
sudo systemctl status nginx

# Rebuild frontend
cd /var/www/datathon/frontend
npm run build
```

### MongoDB connection issues
```bash
sudo systemctl status mongod
mongosh  # Test connection
```

### Permission issues
```bash
sudo chown -R www-data:www-data /var/www/datathon
sudo chmod -R 755 /var/www/datathon
```

## Security Checklist

- ✅ Change default admin password
- ✅ Use strong MongoDB password
- ✅ Enable firewall (UFW)
- ✅ Install SSL certificate
- ✅ Use environment variables for secrets
- ✅ Regular backups
- ✅ Keep system updated: `sudo apt update && sudo apt upgrade`

## Your Application URLs

- **Website**: https://yourdomain.com
- **Admin Login**: https://yourdomain.com/admin/login
- **API**: https://yourdomain.com/api

## Default Admin Credentials
- **Email**: vipulphatangare3@gmail.com
- **Password**: 123456
- ⚠️ **Change immediately after first login!**

---

**Support**: If you encounter issues, check logs first (pm2 logs, nginx logs, mongodb logs)
