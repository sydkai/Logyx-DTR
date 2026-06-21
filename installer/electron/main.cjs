'use strict';

// ─── Imports ──────────────────────────────────────────────────────────────────

const { app, BrowserWindow, dialog } = require('electron');
const { spawn, exec }                = require('child_process');
const { promisify }                  = require('util');
const path                           = require('path');
const fs                             = require('fs');

const execAsync = promisify(exec);

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVER_PORT = 3001;
const VITE_PORT   = 5173;

// Use Electron's built-in flag — never rely on NODE_ENV in packaged apps
const IS_PACKED = app.isPackaged;
const IS_DEV    = !IS_PACKED;

// ─── Paths ────────────────────────────────────────────────────────────────────

// Project structure (your actual layout):
//
//   LOGYX-DTR/                 ← PROJECT_ROOT
//     client/
//       electron/
//         main.cjs             ← __dirname points here
//       public/
//         icon.ico
//       src/
//       package.json
//     server/                  ← SERVER_DIR (has its own node_modules!)
//       controllers/
//       db/
