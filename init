#!/bin/bash

echo "Initializing .env files..."

# Root .env
if [ -f ".env.docker" ]; then
  cp .env.docker .env
  echo "Created .env in root"
else
  echo "Missing .env.docker in root"
fi

# Backend .env
if [ -f "backend/.env.docker" ]; then
  cp backend/.env.docker backend/.env
  echo "Created backend/.env"
else
  echo "Missing backend/.env.docker"
fi

# Frontend .env
if [ -f "frontend/.env.docker" ]; then
  cp frontend/.env.docker frontend/.env
  echo "Created frontend/.env"
else
  echo "Missing frontend/.env.docker"
fi

echo "Done."