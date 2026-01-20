#!/bin/bash

# DATATHON VPS Deployment Script
# Run this script on your VPS after uploading the code

echo "========================================"
echo "DATATHON Deployment Script"
echo "========================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Please run as root (sudo)${NC}"
  exit 1
fi

# Variables
APP_DIR="/var/www/datathon"
DOMAIN="yourdomain.com"

echo -e "${GREEN}[1/10] Installing Node.js...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
node --version

echo -e "${GREEN}[2/10] Installing MongoDB...${NC}"
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt-get update
apt-get install -y mongodb-org
systemctl start mongod
systemctl enable mongod

echo -e "${GREEN}[3/10] Installing PM2...${NC}"
npm install -g pm2

echo -e "${GREEN}[4/10] Installing Nginx...${NC}"
apt install -y nginx
systemctl start nginx
systemctl enable nginx

echo -e "${GREEN}[5/10] Creating application directory...${NC}"
mkdir -p $APP_DIR
cd $APP_DIR

echo -e "${GREEN}[6/10] Installing backend dependencies...${NC}"
cd $APP_DIR/backend
npm install --production

echo -e "${GREEN}[7/10] Installing frontend dependencies and building...${NC}"
cd $APP_DIR/frontend
npm install
npm run build

echo -e "${GREEN}[8/10] Setting up PM2...${NC}"
cd $APP_DIR
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo -e "${GREEN}[9/10] Configuring Nginx...${NC}"
cp $APP_DIR/nginx.conf /etc/nginx/sites-available/datathon
ln -sf /etc/nginx/sites-available/datathon /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

echo -e "${GREEN}[10/10] Setting up firewall...${NC}"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo ""
echo -e "${GREEN}========================================"
echo "Deployment Complete! ✓"
echo "========================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Update backend/.env with your configuration"
echo "2. Update frontend API URL in src/api.js"
echo "3. Upload logo to backend/assets/gfg_logo.png"
echo "4. Initialize admin: curl -X POST http://localhost:4000/api/auth/init-admin"
echo "5. Setup SSL: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo "  pm2 status       - Check backend status"
echo "  pm2 logs         - View logs"
echo "  pm2 restart all  - Restart backend"
echo ""
echo -e "${GREEN}Access your app at: http://$DOMAIN${NC}"
