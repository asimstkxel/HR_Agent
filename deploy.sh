#!/bin/bash
set -e

# ============================================================
#  HR Agent — Hostinger VPS Deployment Script
#  Run this on your Hostinger VPS as root:
#    curl -sL <raw-url> | bash
#  Or copy-paste the entire script into your VPS terminal.
# ============================================================

APP_DIR="/var/www/HR_Agent"
REPO_URL="https://github.com/asimstkxel/HR_Agent.git"
DOMAIN=""
BACKEND_PORT=8000
FRONTEND_PORT=3000

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# -----------------------------------------------------------
# Step 1: Prompt for required inputs
# -----------------------------------------------------------
echo ""
echo "============================================"
echo "  HR Agent — Hostinger VPS Deployment"
echo "============================================"
echo ""

read -rp "Enter your domain name (or VPS IP if no domain): " DOMAIN
[ -z "$DOMAIN" ] && err "Domain/IP is required."

read -rp "Enter your OpenAI API Key: " OPENAI_KEY
[ -z "$OPENAI_KEY" ] && err "OpenAI API key is required."

read -rp "Enter your Tavily API Key: " TAVILY_KEY
[ -z "$TAVILY_KEY" ] && err "Tavily API key is required."

echo ""
log "Deploying to: $DOMAIN"

# -----------------------------------------------------------
# Step 2: Install system dependencies
# -----------------------------------------------------------
log "Installing system dependencies..."
apt update -y
apt install -y python3 python3-pip python3-venv nodejs npm nginx git curl

# Ensure Node.js 20+
NODE_MAJOR=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1)
if [ -z "$NODE_MAJOR" ] || [ "$NODE_MAJOR" -lt 20 ]; then
    log "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

log "Python: $(python3 --version)"
log "Node: $(node --version)"
log "npm: $(npm --version)"

# -----------------------------------------------------------
# Step 3: Clone or update the repo
# -----------------------------------------------------------
if [ -d "$APP_DIR" ]; then
    log "Updating existing installation..."
    cd "$APP_DIR"
    git pull origin main
else
    log "Cloning repository..."
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# -----------------------------------------------------------
# Step 4: Set up Python backend
# -----------------------------------------------------------
log "Setting up Python backend..."
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# -----------------------------------------------------------
# Step 5: Create .env file
# -----------------------------------------------------------
log "Creating .env file..."
cat > "$APP_DIR/.env" << ENVEOF
OPENAI_API_KEY=${OPENAI_KEY}
TAVILY_API_KEY=${TAVILY_KEY}
FRONTEND_URL=http://${DOMAIN}
ENVEOF

# -----------------------------------------------------------
# Step 6: Build frontend
# -----------------------------------------------------------
log "Building frontend..."
cd "$APP_DIR/frontend"
npm install
NEXT_PUBLIC_API_URL="http://${DOMAIN}" npm run build
cd "$APP_DIR"

# -----------------------------------------------------------
# Step 7: Create systemd service — Backend
# -----------------------------------------------------------
log "Creating backend service..."
cat > /etc/systemd/system/hr-agent-backend.service << 'SVCEOF'
[Unit]
Description=HR Agent FastAPI Backend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/HR_Agent
EnvironmentFile=/var/www/HR_Agent/.env
ExecStart=/var/www/HR_Agent/venv/bin/python3 /var/www/HR_Agent/server.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
SVCEOF

# -----------------------------------------------------------
# Step 8: Create systemd service — Frontend
# -----------------------------------------------------------
log "Creating frontend service..."
cat > /etc/systemd/system/hr-agent-frontend.service << 'SVCEOF'
[Unit]
Description=HR Agent Next.js Frontend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/HR_Agent/frontend
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
SVCEOF

# -----------------------------------------------------------
# Step 9: Configure Nginx
# -----------------------------------------------------------
log "Configuring Nginx..."
cat > /etc/nginx/sites-available/hr-agent << NGINXEOF
server {
    listen 80;
    server_name ${DOMAIN};

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:${FRONTEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/hr-agent /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t || err "Nginx config test failed!"

# -----------------------------------------------------------
# Step 10: Start everything
# -----------------------------------------------------------
log "Starting services..."
systemctl daemon-reload
systemctl enable hr-agent-backend hr-agent-frontend nginx
systemctl restart hr-agent-backend
systemctl restart hr-agent-frontend
systemctl restart nginx

# Wait and verify
sleep 3
BACKEND_STATUS=$(systemctl is-active hr-agent-backend)
FRONTEND_STATUS=$(systemctl is-active hr-agent-frontend)
NGINX_STATUS=$(systemctl is-active nginx)

echo ""
echo "============================================"
echo "  Deployment Status"
echo "============================================"
echo ""
echo -e "  Backend:  ${BACKEND_STATUS}"
echo -e "  Frontend: ${FRONTEND_STATUS}"
echo -e "  Nginx:    ${NGINX_STATUS}"
echo ""

if [ "$BACKEND_STATUS" = "active" ] && [ "$FRONTEND_STATUS" = "active" ] && [ "$NGINX_STATUS" = "active" ]; then
    log "Deployment successful!"
    echo ""
    echo "============================================"
    echo "  Your HR Agent is live at:"
    echo "  http://${DOMAIN}"
    echo "============================================"
    echo ""
    echo "  Useful commands:"
    echo "    journalctl -u hr-agent-backend -f   # Backend logs"
    echo "    journalctl -u hr-agent-frontend -f  # Frontend logs"
    echo "    systemctl restart hr-agent-backend   # Restart backend"
    echo "    systemctl restart hr-agent-frontend  # Restart frontend"
    echo ""
    warn "Optional: Set up SSL with:"
    echo "    apt install -y certbot python3-certbot-nginx"
    echo "    certbot --nginx -d ${DOMAIN}"
    echo ""
else
    err "Some services failed to start. Check logs with:"
    echo "    journalctl -u hr-agent-backend -e"
    echo "    journalctl -u hr-agent-frontend -e"
fi
