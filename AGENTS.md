# Agent Guidelines for Audio Fix Manager

This document provides comprehensive guidelines for AI agents and developers working on the Audio Fix Manager codebase.

## 1. Project Overview

**Stack:**
- **Backend:** Express.js + PostgreSQL (Port 3001)
- **Frontend:** React 18 + Vite (Renderer process)
- **Authentication:** JWT + Bcrypt (Role-Based Access Control)
- **Runtime:** Electron (Optional wrapper) / Browser (Primary)
- **Styling:** Tailwind CSS + PostCSS
- **Navigation:** React Router DOM (HashRouter)
- **Icons:** Lucide React
- **Language:** JavaScript (ES6+ / JSX)

**Architecture:**
- `server/`: Express API and Database logic.
- `src/`: React frontend code.
- `src/lib/api.js`: REST API Client (fetches from `http://localhost:3001/api`).
- `electron/`: Legacy Electron wrapper (currently unused for data persistence).

## 2. Build & Verification Commands

Since this project does not currently have dedicated test or lint scripts, verification relies on the build process and manual verification guidelines.

### Core Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install all dependencies (Frontend). |
| `npm run dev` | Start Frontend (Vite) on port 5173. |
| `npm run build` | Build the React app via Vite. **Run this to verify syntax/compilation.** |
| `cd server && npm run dev` | Start Backend API on port 3001. |

### Verification Workflow

For any code change, perform the following:
1.  **Static Analysis:** Ensure code follows the syntax valid for Node.js (Backend) or Browser (React).
2.  **Compilation Check:** Run `npm run build` to ensure there are no build errors.
3.  **Manual Verification:** If possible, describe how the change can be manually verified in the running app.

*Note: There are currently no unit tests (`jest`, `vitest`) or linters (`eslint`) configured. Do not hallucinate successful test runs.*

## 3. Code Style & Conventions

### General Formatting
- **Indentation:** 2 spaces.
- **Semicolons:** Always use semicolons at the end of statements.
- **Quotes:** 
  - Use **single quotes** (`'`) for JavaScript strings and imports.
  - Use **double quotes** (`"`) for JSX attributes (e.g., `className="..."`).
- **Trailing Commas:** Trailing commas in objects/arrays are permitted but not strictly enforced (follow existing file consistency).

### Naming Conventions
- **Components:** PascalCase (e.g., `ClientDetail.jsx`, `Sidebar.jsx`).
- **Functions/Variables:** camelCase (e.g., `updateStatus`, `navClass`).
- **Files:**
  - Components: PascalCase (`App.jsx`).
  - Utilities/Scripts: camelCase (`api.js`, `main.js`).
  - Constants: UPPER_SNAKE_CASE (if applicable).

### React Components
- **Functional Components:** Use Arrow Functions for component definitions.
  ```jsx
  const ComponentName = ({ prop1 }) => {
    return <div>...</div>;
  };
  export default ComponentName;
  ```
- **Hooks:** Place hooks at the top of the component.
- **JSX:**
  - Multiline JSX should be wrapped in parentheses `( ... )`.
  - Self-close tags when there are no children (`<Sidebar />`).

### Styling (Tailwind CSS)
- Use standard Tailwind utility classes in `className`.
- Group related classes where reasonable (layout, spacing, typography, color).
- Do not use `@apply` in CSS files unless absolutely necessary for repeated patterns; prefer utility classes directly in JSX.
- **Dark Mode:** The app seems to use a dark theme by default (`bg-zinc-950`, `text-zinc-100`). Respect this color palette.
- **Colors:** Use `zinc` for grays and `amber` for accents (based on `Sidebar.jsx`).

### Data Fetching & Auth
- **No Direct DB Access:** Frontend components must NEVER access `localStorage` or Electron IPC directly for data.
- **Use API Lib:** Always import functions from `@/lib/api`.
  ```javascript
  import { getRepairs, updateClient } from '@/lib/api';
  // ...
  const repairs = await getRepairs({ clientId: '123' });
  ```
- **Authentication:** 
  - Use `useAuth()` hook for user context (`user`, `login`, `logout`, `isAdmin`).
  - API calls automatically attach the JWT token from localStorage.
  - Admin-only routes are protected via `<ProtectedRoute>` and backend `verifyAdmin` middleware.

## 4. Import Order
Organize imports in the following groups, separated by a blank line:
1.  **React & Standard Libraries:** `import React from 'react';`
2.  **Third-Party Libraries:** `import { HashRouter } from 'react-router-dom';`
3.  **Local Components:** `import Sidebar from './components/Sidebar';`
4.  **Local Utilities/Assets:** `import { getRepairs } from './lib/api';`
5.  **Styles:** `import './index.css';`

## 5. Error Handling
- **Async Operations:** Use `try/catch` blocks for all async operations in `useEffect` or event handlers.
- **UI Feedback:** Ensure the user is notified of errors (console logging is minimal acceptable, UI toast/alert preferred if available).

## 6. Directory Structure Rules
- `server/`: Backend Express app.
  - `routes/`: API endpoints (`auth.js`, `users.js`, `clients.js`, `repairs.js`, `parts.js`).
  - `middleware/`: Auth verification logic.
- `src/components/`: Reusable UI parts (Sidebar, Buttons, etc.).
- `src/pages/`: Full page views mapped to Routes.
- `src/lib/`: Logic, API wrappers, helpers.
- `src/context/`: Global state providers (`AuthContext.jsx`).
- `src/assets/`: Static images/icons if not using components.

## 7. Workflow for Agents
1.  **Read Context:** Always read related files (`App.jsx` for routing, `api.js` for data) before making changes.
2.  **Match Style:** Copy the patterns found in `Sidebar.jsx` for UI consistency.
3.  **No New Dependencies:** Do not add `npm` packages unless explicitly requested. Use existing libraries (`lucide-react`, `date-fns` if present, etc.).
4.  **Verify:** Run `npm run build` after *every* significant change to ensure the build pipeline stays green.

## 8. Specific File Patterns

**`server/routes/*.js`**
- Express routers handling specific resource logic.
- Must use `verifyToken` middleware for protected routes.

**`src/lib/api.js`**
- Centralized fetch wrapper. All API calls must go through here.
- Handles authorization headers automatically.

**`vite.config.js`**
- Configured for React. Ensure it remains compatible with Electron build steps.

## 9. Known Issues / Constraints
- **Routing:** Must use `HashRouter` because Electron serves files from the file system where standard history API might fail.
- **Backend Required:** The React app requires the backend server running on port 3001 to function.
- **Database:** Requires PostgreSQL running on port 5432 (configured via `server/.env`).
- **Default Credentials:** `willy` / `audiofix123` (Admin).

## 10. Environment & Tooling Constraints
- **Platform:** Windows (win32).
- **Shell:** Bash is used for command execution (Git Bash).
- **File Listing:** **DO NOT** use `ls` commands. Use the provided `glob` or `read` tools to inspect file structures.
- **Path Separators:** While Bash handles forward slashes, be mindful that the underlying OS is Windows.

## 11. Inventory & Parts System
- **Routes:** `server/routes/parts.js` manages inventory.
- **Tables:** `parts`, `part_aliases`, `repair_parts`.
- **Logic:**
  - Admin controls stock levels, pricing, and aliases.
  - Technicians add parts to repairs (`RepairDetail.jsx`).
  - Stock is deducted upon adding to a repair and restored upon removal.
  - Prices are locked in `repair_parts` at the time of addition.

## 12. Media & File Handling
- **Service:** Cloudinary (for image hosting and CDN).
- **Backend:** `server/routes/repairs.js` handles file uploads via `multer` (memory storage) and streams to Cloudinary.
- **Database:** `repair_photos` table stores the `url` and `public_id` (Cloudinary ID) linked to a `repair_id`.
- **Frontend:**
  - `RepairDetail.jsx` displays a photo gallery.
  - Users can upload photos (instant upload) and delete them.
  - Images are opened in a new tab for full viewing.
- **Environment Variables:** Requires `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `server/.env`.

---
*End of Guidelines*
