#!/usr/bin/env bash
set -o errexit

export ELECTRON_SKIP_BINARY_DOWNLOAD=1

cd server
npm install

cd ../client
rm -rf node_modules
npm install --include=dev
npm run build

mkdir -p ../data
