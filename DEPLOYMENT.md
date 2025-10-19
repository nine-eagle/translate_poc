# Speech Translation POC - Docker Deployment Guide

This guide will help you deploy the Speech Translation POC application on a Linux server using Docker and Docker Compose.

## Prerequisites

- Linux server with Docker and Docker Compose installed
- At least 4GB RAM (recommended 8GB for ML model loading)
- At least 10GB free disk space
- Ports 80 and 8000 available

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

### 3. Build and Deploy

```bash
# Build and start the containers
docker-compose up -d --build

# Check if containers are running
docker-compose ps

# View logs if needed
docker-compose logs -f
```

### 4. Verify Deployment

- Open your browser and navigate to `http://your-server-ip`
- The application should load with the Speech Translation interface
- Test the translation functionality

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

### SSL/HTTPS Setup (Optional)

For production deployment with SSL:

1. Obtain SSL certificates
2. Update `ui/nginx.conf` to include SSL configuration
3. Modify `docker-compose.yml` to expose port 443

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

1. **Firewall**: Configure firewall to only allow necessary ports
2. **SSL**: Use HTTPS in production
3. **Updates**: Regularly update Docker images and dependencies
4. **Access Control**: Consider adding authentication if needed

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
│   ├── nginx.conf
│   ├── index.html
│   ├── functions.js
│   └── style.css
├── docker-compose.yml
└── DEPLOYMENT.md
```

## Support

If you encounter issues:

1. Check the logs: `docker-compose logs -f`
2. Verify all files are in the correct locations
3. Ensure Docker and Docker Compose are properly installed
4. Check server resources (RAM, disk space)

For additional help, refer to the Docker and Docker Compose documentation.
