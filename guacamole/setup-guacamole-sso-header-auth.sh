#!/bin/bash
set -euo pipefail

GUAC_VERSION="1.5.5"
EXT_DIR="./extensions"
HEADER_JAR="guacamole-auth-header-${GUAC_VERSION}.jar"
DOWNLOAD_URL="https://apache.org/dyn/closer.lua/guacamole/${GUAC_VERSION}/binary/guacamole-auth-sso-${GUAC_VERSION}.tar.gz?action=download"

echo "[guac-header] Setting up Guacamole Header Authentication extension..."

mkdir -p "$EXT_DIR"

# Check if already downloaded
if [ -f "$EXT_DIR/$HEADER_JAR" ]; then
    echo "[guac-header] Extension already exists: $HEADER_JAR"
    echo "[guac-header] Done."
    exit 0
fi

# Create temp directory
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

echo "[guac-header] Downloading guacamole-auth-sso-${GUAC_VERSION}.tar.gz..."
if ! curl -fsSL -o "$TMP_DIR/guacamole-auth-sso.tar.gz" "$DOWNLOAD_URL"; then
    echo "[guac-header] ERROR: Failed to download from Apache mirror. Trying archive.apache.org..."
    DOWNLOAD_URL="https://archive.apache.org/dist/guacamole/${GUAC_VERSION}/binary/guacamole-auth-sso-${GUAC_VERSION}.tar.gz"
    curl -fsSL -o "$TMP_DIR/guacamole-auth-sso.tar.gz" "$DOWNLOAD_URL"
fi

echo "[guac-header] Extracting archive..."
tar -xzf "$TMP_DIR/guacamole-auth-sso.tar.gz" -C "$TMP_DIR"

echo "[guac-header] Copying Header Auth JAR to $EXT_DIR..."
cp "$TMP_DIR/guacamole-auth-sso-${GUAC_VERSION}/header/$HEADER_JAR" "$EXT_DIR/"

echo "[guac-header] Verifying installation..."
if [ -f "$EXT_DIR/$HEADER_JAR" ]; then
    echo "[guac-header] SUCCESS: $HEADER_JAR installed at $EXT_DIR/$HEADER_JAR"
    ls -lh "$EXT_DIR/$HEADER_JAR"
else
    echo "[guac-header] ERROR: Installation failed"
    exit 1
fi

echo "[guac-header] Done. You can now run: docker compose -f docker-compose.prod.yml up -d"