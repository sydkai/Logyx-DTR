#!/usr/bin/env bash
set -o errexit

cd server
npm ci

cd ../client
npm ci
npm run build:standalone

mkdir -p ../data
