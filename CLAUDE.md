# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Audio Fix Manager — a full-stack repair shop management system for audio equipment. React frontend + Express/PostgreSQL backend, optionally wrapped in Electron for Windows desktop distribution.

## Development Commands

### Frontend (root directory)
```bash
npm run dev          # Start Vite dev server (port 5173) + Electron
npm run build        # Production build via Vite
npm run preview      # Preview production build
npm run electron:build  # Package as Windows installer (.exe)
```

### Backend (server/ directory)
```bash
cd server
npm run dev          # Start Express with nodemon (port 3001, auto-reload)
npm start            # Start Express without auto-reload
npm run db:up        # Start PostgreSQL via Docker Compose (port 5432)
npm run db:down      # Stop PostgreSQL
```

Both frontend and backend must run simultaneously during development.

## Architecture

### Stack
- **Frontend:** React 18 + Vite + Tailwind CSS (dark mode via `class` strategy)
- **Backend:** Express.js REST API + PostgreSQL 15 (via `pg` connection pool)
- **Desktop:** Electron wrapper (optional)
- **Auth:** JWT tokens (no expiry) with role-based access (admin vs technician)
- **Storage:** Cloudinary for images, Nodemailer for email, Twilio for SMS

### Client-Server Communication
Frontend uses a centralized API client (`src/lib/api.js`) with `fetchJSON` wrapper around `fetch`. Server URL is resolved dynamically: `localStorage.server_url` > `window.location.hostname:3001`. All protected endpoints require `Authorization: Bearer <token>` header.

Global API errors (500s, network failures) are dispatched as `api-error` custom events, caught by `ErrorContext`.

### Frontend Structure
- **Routing:** HashRouter (required for Electron `file://` protocol)
- **State:** React Context providers — `AuthContext`, `ThemeContext`, `ErrorContext`
- **Pages:** `src/pages/` — each page is a self-contained view (Dashboard, Intake, Workbench, RepairDetail, Inventory, Payroll, etc.)
- **Components:** `src/components/` — shared UI (Sidebar, Modal, ProtectedRoute, EstimateWizard)
- **Components (repair):** `src/components/repair/` — RepairDetail sub-components (UnitSpecsCard, RepairFeesCard, RepairPartsSection, NotesSection, PhotosSection, InvoiceWizardModal, NotificationModal, EstimatesList, ShipmentDetailsCard, CostSummaryCard, ClientDetailsCard, DocumentsCard, AdminActionsCard, EditableTextSection)
- **Custom Hooks:** `src/hooks/` — extracted logic for RepairDetail page (useRepairData, useRepairUpdater, useRepairParts, useNotificationFlow, useEstimateActions)
- **Path alias:** `@` maps to `./src` (configured in vite.config.js)

### RepairDetail Architecture
The RepairDetail page (`src/pages/RepairDetail.jsx`) is a thin orchestrator (~285 lines) that wires together 5 custom hooks and 14 child components. State flows as follows:
- `useRepairData(id)` owns the core data: `ticket`, `setTicket`, `client`, `technicians`, `estimates`
- `useRepairUpdater` provides all `updateRepair()` handlers — accepts data as params, never owns edit state
- `useRepairParts` manages parts search/add/remove workflow and owns 8 state vars
- `useNotificationFlow` manages the email/SMS modal state machine
- `useEstimateActions` manages estimate approve/decline/pending
- Child components own their own edit state (e.g., `UnitSpecsCard` owns `isEditingSpecs`/`tempSpecs`)
- `ticket` + `setTicket` is the single source of truth, threaded to all hooks and components

### Backend Structure
- **Entry:** `server/index.js` — Express app with CORS, routes, static file serving
- **Routes:** `server/routes/` — modular route files (auth, clients, repairs, parts, estimates, users, suggestions)
- **Middleware:** `server/middleware/auth.js` — `verifyToken` and `verifyAdmin`
- **Database:** `server/db.js` — PostgreSQL connection pool; schema in `server/schema.sql`
- **Config:** `server/.env` — database URL, Cloudinary, SMTP, Twilio, JWT secret

### Key Database Tables
- `users` — auth with roles (admin requires password, technician is passwordless)
- `clients` + `client_phones` — customers with multi-phone support
- `repairs` — main tickets with status workflow: checked_in → diagnosing → repairing → parts → estimate → ready → closed
- `repair_photos`, `repair_notes`, `repair_parts` — repair attachments
- `parts` + `part_aliases` — inventory with alias-based search
- `estimates` — generated via multi-step EstimateWizard

### File Uploads
Parts and repair photos use `multer` for upload handling → Cloudinary for storage. When sending FormData, do NOT set `Content-Type` header (browser sets multipart boundary automatically).

## Styling Conventions

- Dark theme is default: `bg-zinc-950`, `text-zinc-100`
- Accent color: amber (`#f59e0b`, Tailwind `amber-500`)
- All interactive elements should support both light and dark mode classes
- Custom Tailwind color `amp-orange` defined in tailwind.config.js

## Keyboard Shortcuts

F1 = Intake, F2 = Search, F3 = Inventory (registered in Sidebar component)
