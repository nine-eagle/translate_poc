#!/bin/bash

# SSL Certificate Setup Script for aitranspoc.com
# This script sets up SSL certificates using Let's Encrypt and Certbot

set -e

DOMAIN="aitranspoc.com"
EMAIL="admin@aitranspoc.com"

echo "🔐 Setting up SSL certificates for $DOMAIN..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Create certbot directories
echo "📁 Creating certbot directories..."
mkdir -p certbot/conf
mkdir -p certbot/www

# Check if domain is pointing to this server
echo "🌐 Checking DNS configuration..."
SERVER_IP=$(curl -s ifconfig.me)
DOMAIN_IP=$(dig +short $DOMAIN | tail -n1)

if [ "$SERVER_IP" != "$DOMAIN_IP" ]; then
    echo "⚠️  Warning: Domain $DOMAIN ($DOMAIN_IP) is not pointing to this server ($SERVER_IP)"
    echo "   Please update your DNS records before continuing."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Start services without SSL first
echo "🚀 Starting services without SSL..."
docker-compose up -d frontend backend

# Wait for nginx to be ready
echo "⏳ Waiting for nginx to be ready..."
sleep 10

# Request SSL certificate
echo "📜 Requesting SSL certificate from Let's Encrypt..."
docker-compose run --rm certbot

# Check if certificate was created
if [ ! -f "certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
    echo "❌ SSL certificate creation failed!"
    echo "   Please check the logs and ensure:"
    echo "   1. Domain is pointing to this server"
    echo "   2. Ports 80 and 443 are open"
    echo "   3. No firewall is blocking the connection"
    exit 1
fi

echo "✅ SSL certificate created successfully!"

# Restart nginx with SSL configuration
echo "🔄 Restarting nginx with SSL configuration..."
docker-compose restart frontend

# Test SSL certificate
echo "🧪 Testing SSL certificate..."
sleep 5

if curl -f https://$DOMAIN > /dev/null 2>&1; then
    echo "✅ HTTPS is working correctly!"
    echo "   Your site is now available at: https://$DOMAIN"
else
    echo "⚠️  HTTPS test failed. Please check the configuration."
fi

# Set up automatic renewal
echo "🔄 Setting up automatic certificate renewal..."
cat > renew-ssl.sh << 'EOF'
#!/bin/bash
# Renew SSL certificates
docker-compose run --rm certbot renew
docker-compose restart frontend
EOF

chmod +x renew-ssl.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "0 12 * * * $(pwd)/renew-ssl.sh >> $(pwd)/ssl-renewal.log 2>&1") | crontab -

echo ""
echo "🎉 SSL setup completed successfully!"
echo ""
echo "📋 Your application is now available at:"
echo "   https://$DOMAIN"
echo "   https://www.$DOMAIN"
echo ""
echo "🔧 SSL certificate will auto-renew via cron job"
echo "📝 Renewal logs: ssl-renewal.log"
echo ""
echo "📊 Check certificate status:"
echo "   docker-compose logs certbot"
echo ""
