FROM alpine:3.22

# Install build dependencies and runtime dependencies
RUN \
  apk add --no-cache --virtual=build-dependencies \
    build-base \
    cargo \
    libffi-dev \
    libpq-dev \
    libxml2-dev \
    libxslt-dev \
    python3-dev && \
  apk add --no-cache \
    ffmpeg \
    libxml2 \
    libxslt \
    mediainfo \
    python3 \
    py3-pip \
    p7zip \
    nodejs \
    npm \
    bash \
    git && \
  mkdir -p \
    /app/bazarr/bin \
    /app/bazarr/data/config \
    /app/bazarr/data/cache \
    /app/bazarr/data/log

# Set working directory
WORKDIR /app/bazarr/bin

# Copy the entire project
COPY . .

# Install Python dependencies
RUN \
   pip install --break-system-packages -U --no-cache-dir --find-links https://wheel-index.linuxserver.io/alpine-3.22/ \
    -r /app/bazarr/bin/requirements.txt \
    -r /app/bazarr/bin/postgres-requirements.txt \
    -r /app/bazarr/bin/dev-requirements.txt

# Setup frontend
WORKDIR /app/bazarr/bin/frontend

# Install frontend dependencies and setup environment
RUN npm install && cp .env.development .env.development.local

# Back to main directory
WORKDIR /app/bazarr/bin

# Create symlinks so that imports work (Bazarr expects these to be in the root)
RUN ln -sf bazarr/app app && \
    ln -sf bazarr/utilities utilities && \
    ln -sf bazarr/literals.py literals.py && \
    ln -sf bazarr/constants.py constants.py && \
    ln -sf bazarr/init.py init.py && \
    ln -sf bazarr/languages languages && \
    ln -sf bazarr/api api && \
    ln -sf bazarr/subtitles subtitles && \
    ln -sf bazarr/radarr radarr && \
    ln -sf bazarr/sonarr sonarr && \
    ln -sf bazarr/plex plex

# Expose ports
EXPOSE 6767
EXPOSE 5173

# Environment variables
ENV SZ_USER_AGENT="bazarr-dev"
ENV BAZARR_VERSION="dev"
ENV PYTHONPATH="/app/bazarr/bin/libs:/app/bazarr/bin:/app/bazarr/bin/custom_libs"

# Default command (can be overridden by docker-compose)
CMD ["sh", "-c", "echo 'Use docker-compose to start services'"]
