#!/bin/bash

# Complete SSL Deployment Script for aitranspoc.com
# This script deploys the application with SSL/HTTPS support

set -e

DOMAIN="aitranspoc.com"
EMAIL="admin@aitranspoc.com"

echo "🚀 Starting SSL-enabled deployment for $DOMAIN..."

# Check prerequisites
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml not found. Please run this script from the project root directory."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p certbot/conf
mkdir -p certbot/www
mkdir -p backend/uploaded_audio

# Check DNS configuration
echo "🌐 Checking DNS configuration..."
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "unknown")
DOMAIN_IP=$(dig +short $DOMAIN 2>/dev/null | tail -n1 || echo "unknown")

if [ "$SERVER_IP" != "$DOMAIN_IP" ] && [ "$DOMAIN_IP" != "unknown" ]; then
    echo "⚠️  Warning: Domain $DOMAIN ($DOMAIN_IP) is not pointing to this server ($SERVER_IP)"
    echo "   Please update your DNS records to point $DOMAIN to this server's IP address."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Build and start services (without SSL first)
echo "🔨 Building and starting services..."
docker-compose up -d --build backend frontend

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 15

# Check if HTTP is working
if curl -f http://localhost:80 > /dev/null 2>&1; then
    echo "✅ HTTP service is running"
else
    echo "❌ HTTP service is not responding. Check logs with: docker-compose logs frontend"
    exit 1
fi

# Request SSL certificate
echo "📜 Requesting SSL certificate from Let's Encrypt..."
if docker-compose run --rm certbot; then
    echo "✅ SSL certificate obtained successfully"
else
    echo "❌ SSL certificate request failed!"
    echo "   Common issues:"
    echo "   1. Domain not pointing to this server"
    echo "   2. Ports 80/443 not accessible"
    echo "   3. Firewall blocking connections"
    echo ""
    echo "   You can still run without SSL by accessing: http://$DOMAIN"
    read -p "Continue without SSL? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Restart nginx with SSL configuration
echo "🔄 Restarting nginx with SSL configuration..."
docker-compose restart frontend

# Wait for nginx to restart
sleep 5

# Test HTTPS
echo "🧪 Testing HTTPS connection..."
if curl -f https://localhost:443 > /dev/null 2>&1; then
    echo "✅ HTTPS is working correctly!"
else
    echo "⚠️  HTTPS test failed, but HTTP should still work"
fi

# Set up automatic renewal
echo "🔄 Setting up automatic certificate renewal..."
if ! crontab -l 2>/dev/null | grep -q "renew-ssl.sh"; then
    (crontab -l 2>/dev/null; echo "0 12 * * * $(pwd)/renew-ssl.sh >> $(pwd)/ssl-renewal.log 2>&1") | crontab -
    echo "✅ Automatic renewal scheduled"
else
    echo "✅ Automatic renewal already configured"
fi

# Final status check
echo "📊 Final status check..."
docker-compose ps

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Your application is now available at:"
echo "   🌐 HTTP:  http://$DOMAIN (redirects to HTTPS)"
echo "   🔒 HTTPS: https://$DOMAIN"
echo "   🔒 HTTPS: https://www.$DOMAIN"
echo ""
echo "📝 Useful commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart services: docker-compose restart"
echo "   Renew SSL: ./renew-ssl.sh"
echo "   Check SSL status: docker-compose logs certbot"
echo ""
echo "🔍 For troubleshooting, check the DEPLOYMENT.md file"
