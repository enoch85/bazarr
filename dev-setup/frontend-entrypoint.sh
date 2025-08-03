#!/bin/sh

echo "Waiting for backend to be ready..."

# Wait for backend to be reachable
until nc -z bazarr-backend 6767 2>/dev/null; do
    echo "Backend not ready yet, waiting..."
    sleep 5
done

echo "Backend is ready!"

# In development mode, we don't need to wait for API key since authentication might be disabled
echo "Starting frontend in development mode..."

# Copy the dev HTML file over the main index.html for development
if [ -f "/app/index.dev.html" ]; then
    cp /app/index.dev.html /app/index.html
    echo "Using development index.html with base href set to '/'"
fi

# Start the frontend with --no-open to prevent browser auto-open attempts in container
exec npm run start -- --host --no-open
