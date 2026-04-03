#!/bin/bash
# PolyX Web Dashboard — Deployment Script
# Run on the VPS as ubuntu user

set -e

echo "=== PolyX Web Dashboard Setup ==="

# 1. Pull latest code
cd ~/polyx_bot_new
git pull

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Build Next.js frontend
cd polyx_web
npm install
npx next build
cd ..

# 4. Run database migration
python -m migrations.001_add_user_id

# 5. Copy systemd services
sudo cp deploy/polyx-telegram.service /etc/systemd/system/
sudo cp deploy/polyx-api.service /etc/systemd/system/
sudo cp deploy/polyx-worker.service /etc/systemd/system/
sudo cp deploy/polyx-web.service /etc/systemd/system/

# 6. Copy NGINX config
sudo cp deploy/nginx-polyx.conf /etc/nginx/sites-available/polyx
sudo ln -sf /etc/nginx/sites-available/polyx /etc/nginx/sites-enabled/polyx
sudo nginx -t && sudo systemctl reload nginx

# 7. Enable and start services
sudo systemctl daemon-reload
sudo systemctl enable polyx-telegram polyx-api polyx-worker polyx-web
sudo systemctl restart polyx-telegram
sudo systemctl restart polyx-api
sudo systemctl restart polyx-worker
sudo systemctl restart polyx-web

# 8. Check status
echo ""
echo "=== Service Status ==="
sudo systemctl status polyx-telegram --no-pager -l | head -5
sudo systemctl status polyx-api --no-pager -l | head -5
sudo systemctl status polyx-worker --no-pager -l | head -5
sudo systemctl status polyx-web --no-pager -l | head -5

echo ""
echo "=== Setup Complete ==="
echo "Dashboard: https://app.polyx.io"
echo "API: https://app.polyx.io/api/health"
echo ""
echo "To get SSL certificate:"
echo "  sudo certbot --nginx -d app.polyx.io"
