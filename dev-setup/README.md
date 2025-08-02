# Bazarr Development Environment

A complete Docker-based development environment for Bazarr with live code reloading for both backend and frontend.

## Quick Start

### 1. Clone your fork
```bash
git clone https://github.com/YOUR_USERNAME/bazarr.git
cd bazarr/dev-setup
```

### 2. Create data directory
```bash
mkdir -p data/config data/cache data/log
```

### 3. Start development environment
```bash
docker compose up --build
```

### 4. Access applications
**🌐 Open your browser to: http://localhost:5173**

This is the Bazarr web interface with live reloading. The frontend automatically communicates with the backend API (port 6767).

**Important**: Always use port 5173 to access Bazarr - port 6767 is API-only and not meant for direct browser access.

## What This Provides

### 🐳 **Fully Containerized Development**
- All development happens inside Docker containers
- No need for local Node.js, Python, or other dependencies on your host
- Consistent development environment across different machines

### 🔄 **Live Code Reloading**
- **Backend**: Python files are mounted and changes reflect immediately
- **Frontend**: Full frontend directory mounted with Vite hot module replacement
- **Libraries**: Both custom_libs and libs are mounted for modification

### 📁 **Volume Mounts**
```
../bazarr         → /app/bazarr/bin/bazarr       (Backend source)
../frontend       → /app/bazarr/bin/frontend     (Frontend source)
../custom_libs    → /app/bazarr/bin/custom_libs  (Custom libraries)
../libs           → /app/bazarr/bin/libs         (Third-party libraries)
./data            → /app/bazarr/data             (Persistent data)
```

### 🌐 **Port Configuration**
- **6767**: Bazarr backend API and web interface
- **5173**: Vite development server with hot reloading

## Development Workflow

### Making Changes

1. **Backend Development**:
   - Edit files in `../bazarr/` directory
   - Changes are immediately available in the running container
   - No restart needed for most Python changes

2. **Frontend Development**:
   - Edit files in `../frontend/` directory
   - Vite automatically reloads the browser
   - Install new npm packages by rebuilding: `docker compose up --build`

3. **Adding Dependencies**:
   - **Python**: Add to `../requirements.txt` and rebuild
   - **Node.js**: Add to `../frontend/package.json` and rebuild

### Useful Commands

```bash
# Start development environment
docker compose up

# Start in background (detached)
docker compose up -d

# Rebuild after dependency changes
docker compose up --build

# View logs
docker compose logs -f

# Access container shell for debugging
docker compose exec bazarr-dev sh

# Stop the environment
docker compose down

# Complete cleanup (removes containers, networks, volumes)
docker compose down -v
```

## Environment Configuration

The development environment includes these settings:

```bash
NODE_ENV=development
VITE_PROXY_URL=http://127.0.0.1:6767
VITE_BAZARR_CONFIG_FILE=/app/bazarr/data/config/config.yaml
VITE_CAN_UPDATE=true
VITE_HAS_UPDATE=false
VITE_REACT_QUERY_DEVTOOLS=true
```

## Data Persistence

Configuration and data are persisted in the `./data` directory:
- `./data/config/` - Bazarr configuration files
- `./data/cache/` - Application cache
- `./data/log/` - Application logs

## Troubleshooting

### Port Conflicts
If ports 6767 or 5173 are already in use:
```bash
# Check what's using the ports
lsof -i :6767
lsof -i :5173

# Either stop those services or modify ports in docker-compose.yml
```

### Permission Issues
```bash
# Fix data directory permissions
sudo chown -R $USER:$USER ./data
```

### Frontend Not Loading
- Check container logs: `docker compose logs -f`
- Ensure Vite dev server started successfully
- Try rebuilding: `docker compose up --build`

### Backend API Issues
- Verify backend is running: `docker compose logs bazarr-dev`
- Check if port 6767 is accessible: `curl http://localhost:6767`
- Review Python error logs in the container output

### Complete Reset
If you encounter persistent issues:
```bash
# Stop and remove everything
docker compose down -v

# Remove built images
docker rmi bazarr-dev-setup-bazarr-dev

# Rebuild from scratch
docker compose up --build
```

## Development Tips

### Container Shell Access
```bash
# Access the running container
docker compose exec bazarr-dev sh

# Install additional tools inside container if needed
apk add --no-cache curl vim
```

### Logs and Debugging
```bash
# Follow all logs
docker compose logs -f

# Follow only backend logs
docker compose logs -f bazarr-dev | grep -v "vite"

# Follow only frontend logs  
docker compose logs -f bazarr-dev | grep "vite"
```

### Performance
- The container runs both frontend and backend simultaneously
- Frontend dev server starts first, backend starts after 10 seconds
- All file changes are immediately reflected due to volume mounts

## Architecture

```
Host Machine
├── bazarr/ (your code)
│   ├── bazarr/ → mounted in container
│   ├── frontend/ → mounted in container  
│   ├── custom_libs/ → mounted in container
│   └── libs/ → mounted in container
└── dev-setup/
    ├── data/ → persistent data
    ├── Dockerfile
    ├── docker-compose.yml
    └── README.md

Container (/app/bazarr/bin/)
├── bazarr/ (backend source - mounted)
├── frontend/ (frontend source - mounted)
├── custom_libs/ (mounted)
├── libs/ (mounted)
└── data/ (persistent data - mounted)
```

## Next Steps

1. Start developing - all changes are live!
2. Test your modifications at http://localhost:6767 and http://localhost:5173
3. Submit pull requests to the main repository

Happy coding! 🚀
