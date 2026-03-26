#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> Pulling latest changes..."
cd "$PROJECT_DIR"
git pull

echo "==> Installing frontend dependencies..."
cd "$PROJECT_DIR/frontend"
npm ci

echo "==> Building frontend..."
npm run build
chmod -R 755 "$PROJECT_DIR/frontend/dist"

echo "==> Installing backend dependencies..."
cd "$PROJECT_DIR/backend"
npm ci --omit=dev

echo "==> Restarting backend..."
pm2 restart fintrack-api

echo ""
echo "Deploy completado."
pm2 status fintrack-api
