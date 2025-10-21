#!/bin/bash

# SSL Certificate Renewal Script
# This script renews SSL certificates and restarts nginx

set -e

echo "🔄 Renewing SSL certificates..."

# Renew certificates
docker-compose run --rm certbot renew

# Check if renewal was successful
if [ $? -eq 0 ]; then
    echo "✅ SSL certificates renewed successfully"
    
    # Restart nginx to load new certificates
    echo "🔄 Restarting nginx..."
    docker-compose restart frontend
    
    echo "✅ SSL renewal completed successfully"
else
    echo "❌ SSL certificate renewal failed"
    exit 1
fi
