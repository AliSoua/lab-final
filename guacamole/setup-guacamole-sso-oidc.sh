#!/bin/bash
set -euo pipefail

GUAC_VERSION="1.5.5"
EXT_DIR="./extensions"
JAR_NAME="guacamole-auth-sso-openid-${GUAC_VERSION}.jar"
DOWNLOAD_URL="https://apache.org/dyn/closer.lua/guacamole/${GUAC_VERSION}/binary/guacamole-auth-sso-${GUAC_VERSION}.tar.gz?action=download"

echo "[guac-sso] Setting up Guacamole OpenID extension..."

mkdir -p "$EXT_DIR"

# Check if already downloaded
if [ -f "$EXT_DIR/$JAR_NAME" ]; then
    echo "[guac-sso] Extension already exists: $JAR_NAME"
    echo "[guac-sso] Done."
    exit 0
fi

# Create temp directory
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

echo "[guac-sso] Downloading guacamole-auth-sso-${GUAC_VERSION}.tar.gz..."
if ! curl -fsSL -o "$TMP_DIR/guacamole-auth-sso.tar.gz" "$DOWNLOAD_URL"; then
    echo "[guac-sso] ERROR: Failed to download from Apache mirror. Trying archive.apache.org..."
    DOWNLOAD_URL="https://archive.apache.org/dist/guacamole/${GUAC_VERSION}/binary/guacamole-auth-sso-${GUAC_VERSION}.tar.gz"
    curl -fsSL -o "$TMP_DIR/guacamole-auth-sso.tar.gz" "$DOWNLOAD_URL"
fi

echo "[guac-sso] Extracting archive..."
tar -xzf "$TMP_DIR/guacamole-auth-sso.tar.gz" -C "$TMP_DIR"

echo "[guac-sso] Copying OpenID JAR to $EXT_DIR..."
cp "$TMP_DIR/guacamole-auth-sso-${GUAC_VERSION}/openid/$JAR_NAME" "$EXT_DIR/"

echo "[guac-sso] Verifying installation..."
if [ -f "$EXT_DIR/$JAR_NAME" ]; then
    echo "[guac-sso] SUCCESS: $JAR_NAME installed at $EXT_DIR/$JAR_NAME"
    ls -lh "$EXT_DIR/$JAR_NAME"
else
    echo "[guac-sso] ERROR: Installation failed"
    exit 1
fi

echo "[guac-sso] Done. You can now run: docker compose -f docker-compose.prod.yml up -d"