# Speech Translation POC - Docker Deployment Guide

This guide will help you deploy the Speech Translation POC application on a Linux server using Docker and Docker Compose with SSL/HTTPS support for your domain [aitranspoc.com](http://www.aitranspoc.com/).

## Prerequisites

- Linux server with Docker and Docker Compose installed
- At least 4GB RAM (recommended 8GB for ML model loading)
- At least 10GB free disk space
- Ports 80, 443, and 8000 available
- Domain name (aitranspoc.com) pointing to your server's IP address
- Valid email address for SSL certificate registration

## Installation Steps

### 1. Install Docker and Docker Compose

```bash
# Update package index
sudo apt update

# Install Docker
sudo apt install -y docker.io docker-compose

# Start and enable Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group (optional, to run without sudo)
sudo usermod -aG docker $USER
# Log out and log back in for group changes to take effect
```

### 2. Clone and Prepare the Application

```bash
# Clone your repository or upload the project files
git clone <your-repository-url>
cd translate_poc

# Or if uploading files manually, ensure the directory structure is:
# translate_poc/
# ├── backend/
# │   ├── main.py
# │   ├── requirements.txt
# │   └── Dockerfile
# ├── ui/
# │   ├── index.html
# │   ├── functions.js
# │   ├── style.css
# │   ├── nginx.conf
# │   └── Dockerfile
# └── docker-compose.yml
```

### 3. DNS Configuration

Before deploying, ensure your domain is properly configured:

```bash
# Check if your domain points to your server
dig +short aitranspoc.com
dig +short www.aitranspoc.com

# Your domain should return your server's IP address
```

### 4. Deploy with SSL/HTTPS

#### Option A: Automated SSL Deployment (Recommended)

```bash
# Run the complete SSL deployment script
./deploy-ssl.sh
```

This script will:
- Build and start all services
- Request SSL certificates from Let's Encrypt
- Configure HTTPS with automatic HTTP to HTTPS redirect
- Set up automatic certificate renewal

#### Option B: Manual SSL Setup

```bash
# Build and start the containers
docker-compose up -d --build

# Request SSL certificate
docker-compose run --rm certbot

# Restart nginx with SSL configuration
docker-compose restart frontend
```

### 5. Verify Deployment

- Open your browser and navigate to `https://aitranspoc.com`
- The application should load with the Speech Translation interface
- Test the translation functionality
- Verify that HTTP redirects to HTTPS automatically

## Configuration

### Environment Variables

You can modify the `docker-compose.yml` file to add environment variables:

```yaml
services:
  backend:
    environment:
      - PYTHONPATH=/app
      - PYTHONUNBUFFERED=1
      - MODEL_CACHE_DIR=/app/models  # Optional: specify model cache directory
```

### Port Configuration

To change the ports, modify the `docker-compose.yml`:

```yaml
services:
  frontend:
    ports:
      - "8080:80"  # Change 80 to your desired port
  backend:
    ports:
      - "8001:8000"  # Change 8000 to your desired port
```

### SSL/HTTPS Configuration

The application is configured with automatic SSL/HTTPS support:

- **Automatic HTTP to HTTPS redirect**: All HTTP traffic is redirected to HTTPS
- **Let's Encrypt certificates**: Free SSL certificates with automatic renewal
- **Security headers**: HSTS, XSS protection, and other security headers
- **Modern SSL configuration**: TLS 1.2+ with secure cipher suites

#### SSL Certificate Management

```bash
# Renew certificates manually
./renew-ssl.sh

# Check certificate status
docker-compose logs certbot

# View certificate details
openssl x509 -in certbot/conf/live/aitranspoc.com/fullchain.pem -text -noout
```

#### Custom SSL Configuration

To modify SSL settings, edit `ui/nginx.conf`:

```nginx
# SSL Security Settings
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
```

## Management Commands

### Start/Stop Services

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# View logs
docker-compose logs -f [service-name]
```

### Update Application

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose up -d --build
```

### Backup and Restore

```bash
# Backup uploaded audio files
docker cp translate_backend:/app/uploaded_audio ./backup_audio/

# Restore uploaded audio files
docker cp ./backup_audio/ translate_backend:/app/uploaded_audio/
```

## Troubleshooting

### Common Issues

1. **Container fails to start**
   ```bash
   # Check logs
   docker-compose logs backend
   docker-compose logs frontend
   ```

2. **Out of memory errors**
   - Increase server RAM or add swap space
   - The ML model requires significant memory

3. **Port conflicts**
   ```bash
   # Check what's using the ports
   sudo netstat -tulpn | grep :80
   sudo netstat -tulpn | grep :8000
   ```

4. **WebSocket connection issues**
   - Ensure nginx proxy configuration is correct
   - Check firewall settings

### Performance Optimization

1. **Model Caching**: The first startup will download the ML model (~1-2GB)
2. **Resource Limits**: Add resource limits in `docker-compose.yml`:
   ```yaml
   services:
     backend:
       deploy:
         resources:
           limits:
             memory: 4G
             cpus: '2.0'
   ```

### Monitoring

```bash
# Monitor resource usage
docker stats

# Check container health
docker-compose ps
```

## Security Considerations

1. **Firewall**: Configure firewall to only allow necessary ports (80, 443, 22)
2. **SSL**: HTTPS is automatically configured with Let's Encrypt certificates
3. **Security Headers**: HSTS, XSS protection, and other security headers are enabled
4. **Updates**: Regularly update Docker images and dependencies
5. **Access Control**: Consider adding authentication if needed
6. **Certificate Renewal**: Automatic renewal is configured via cron job

## File Structure After Deployment

```
translate_poc/
├── backend/
│   ├── Dockerfile
│   ├── main.py
│   ├── requirements.txt
│   └── uploaded_audio/          # Volume mounted
├── ui/
│   ├── Dockerfile
│   ├── nginx.conf               # SSL-enabled nginx config
│   ├── index.html
│   ├── functions.js
│   └── style.css
├── certbot/
│   ├── conf/                    # SSL certificates
│   └── www/                     # Webroot for ACME challenges
├── docker-compose.yml           # Includes Certbot service
├── deploy-ssl.sh               # Complete SSL deployment script
├── ssl-setup.sh                # SSL setup script
├── renew-ssl.sh                # Certificate renewal script
└── DEPLOYMENT.md
```

## Support

If you encounter issues:

1. Check the logs: `docker-compose logs -f`
2. Verify all files are in the correct locations
3. Ensure Docker and Docker Compose are properly installed
4. Check server resources (RAM, disk space)

For additional help, refer to the Docker and Docker Compose documentation.
