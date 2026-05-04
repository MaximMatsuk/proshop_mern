# ProShop eCommerce Platform

> eCommerce platform built with the MERN stack & Redux.

> ⚠️ **THIS PROJECT IS DEPRECATED.** It is no longer supported. The new project/course has been released and the code now uses Redux Toolkit. You can find the new version [HERE](https://github.com/bradtraversy/proshop-v2).

## About

ProShop is a learning eCommerce application built on the MERN stack (MongoDB, Express, React, Node) with classic Redux. It covers the full online-shop user journey: a catalog with search and pagination, a shopping cart, checkout with shipping address and payment method (including PayPal), product reviews and ratings, a user profile with order history, and an admin panel for managing products, orders, and users. It is aimed at students of the Brad Traversy course and at developers who want a reference implementation of a full CRUD shop using classic Redux (without Redux Toolkit).

## Features

- Full-featured shopping cart
- Product reviews and ratings
- Top products carousel
- Product pagination and search
- User profile with order history
- Admin product management
- Admin user management
- Admin order details page
- Mark orders as delivered
- Checkout flow (shipping, payment method, etc.)
- PayPal / credit card integration
- Database seeder (products & users)

## Tech Stack

**Backend** (Node.js, native ES Modules):
- `express` ^4.17.1 — HTTP server and routing
- `mongoose` ^5.10.6 — MongoDB ODM
- `jsonwebtoken` ^8.5.1 — JWT issuing/verification
- `bcryptjs` ^2.4.3 — password hashing
- `express-async-handler` ^1.1.4 — async controller wrapper
- `multer` ^1.4.2 — image uploads
- `morgan` ^1.10.0 — HTTP logging
- `dotenv` ^8.2.0 — environment variables
- `colors` ^1.4.0 — colored output in the seeder

**Backend dev**:
- `nodemon` ^2.0.4
- `concurrently` ^5.3.0

**Frontend** (Create React App):
- `react` ^16.13.1, `react-dom` ^16.13.1
- `react-scripts` 3.4.3
- `react-router-dom` ^5.2.0, `react-router-bootstrap` ^0.25.0 (React Router v5)
- `redux` ^4.0.5, `react-redux` ^7.2.1, `redux-thunk` ^2.3.0, `redux-devtools-extension` ^2.13.8
- `axios` ^0.20.0
- `react-bootstrap` ^1.3.0
- `react-helmet` ^6.1.0
- `react-paypal-button-v2` ^2.6.2
- `@testing-library/react` ^9.5.0, `@testing-library/jest-dom` ^4.2.4, `@testing-library/user-event` ^7.2.1

## Project Structure

```
proshop_mern/
├── backend/              # Express API (ES Modules)
│   ├── config/           # db.js — MongoDB connection via Mongoose
│   ├── controllers/      # business logic: product, user, order, upload
│   ├── data/             # seeder fixtures (products, users)
│   ├── middleware/       # authMiddleware (protect/admin), errorMiddleware
│   ├── models/           # Mongoose schemas: Product, User, Order
│   ├── routes/           # /api/* endpoints (productRoutes, userRoutes, ...)
│   ├── utils/            # generateToken and other helpers
│   ├── seeder.js         # import/wipe demo data (npm run data:*)
│   └── server.js         # Express entry point, middleware and routes
├── frontend/             # SPA built with Create React App
│   ├── public/           # CRA static assets (index.html, favicon)
│   └── src/
│       ├── actions/      # Redux thunks (axios + dispatch triads)
│       ├── components/   # reusable UI components
│       ├── constants/    # Redux action types (_REQUEST/_SUCCESS/_FAIL)
│       ├── reducers/     # reducers per domain (product, cart, user, order)
│       ├── screens/      # page-level components bound to routes
│       ├── App.js        # routing with React Router v5
│       ├── store.js      # combineReducers + hydration from localStorage
│       └── index.js      # React entry point
├── uploads/              # user uploads via multer (jpg/jpeg/png)
├── Procfile              # Heroku launch config
├── package.json          # backend dependencies and orchestration scripts
├── .env                  # environment variables (created manually)
└── README.md
```

## Local Installation

### Requirements

- **Node.js**: below v20 (Node 16 recommended, minimum v14.6+ for ES Modules support). The project does not work on Node 20.
- **npm** (bundled with Node).
- **Docker** (to run MongoDB) or your own MongoDB instance.

### 1. Clone the repo and install dependencies

```bash
git clone <repo-url>
cd proshop_mern

# Backend dependencies
npm install

# Frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Run MongoDB via Docker

```bash
docker run -d -p 27017:27017 --name mongo mongo:7
```

This starts MongoDB 7 in the background on the default port `27017`. Use `docker stop mongo` / `docker start mongo` to stop or restart the container.

### 3. Environment variables

Create a `.env` file at the project root with the following values:

```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/proshop
JWT_SECRET=abc123
PAYPAL_CLIENT_ID=your_paypal_client_id
```

### 4. Seed the database

```bash
# Import demo users and products
npm run data:import

# Wipe all data
npm run data:destroy
```

Sample accounts after import:

```
admin@example.com / 123456 (Admin)
john@example.com  / 123456 (Customer)
jane@example.com  / 123456 (Customer)
```

### 5. Run the project

```bash
# Frontend (:3000) + backend (:5000) together
npm run dev

# Backend only
npm run server

# Frontend only
npm run client
```

The application is available at [http://localhost:3000](http://localhost:3000).

## Build & Deploy

```bash
# Create the frontend production build
cd frontend
npm run build
```

A Heroku `postbuild` script is included, so a manual frontend build is not required for Heroku deployments.

## Documentation corpus & MCP servers

The repository ships with a project-knowledge corpus and two MCP servers that let an AI agent (Claude Code, Cursor, etc.) introspect the project without re-reading the source tree on every question.

### `project-data/` — source documentation

Markdown sources for the corpus, organised by group: `adrs/`, `runbooks/`, `incidents/`, `api/`, `pages/`, `features/`, plus top-level docs (`architecture.md`, `glossary.md`, `best-practices.md`, `dev-history.md`, `feature-flags-spec.md`, `features-analysis-ru.md`).

### `data/` — chunked corpus for RAG

Pre-built chunk files produced by the chunking pipeline in `scripts/`:

```
data/chunks.jsonl                  # combined corpus
data/chunks.<group>.jsonl          # per-group: adrs, api, features, incidents, pages, runbooks, toplevel
data/report.md                     # ingest report
```

Each line is a JSON chunk with text plus metadata (`source_file`, `file_path`, `title`, `parent_headings`, `heading_path`, `group`, `language`, `summary`). Chunks are embedded with `bge-m3` via Ollama and indexed in Qdrant (collection `proshop_docs`). Pipeline scripts live in `scripts/`: `normalize-chunks.ts` → `finalize-chunks.ts` → `ingest-qdrant.ts`. Manual queries: `tsx scripts/query-qdrant.ts "<query>"`.

### MCP servers (`.mcp.json`)

| Server | Path | Tools |
|---|---|---|
| `project-docs` | `mcp-server-rag/` | `search_project_docs(query, top_k=5, rewrite=false)` — semantic search over the indexed `data/` chunks |
| `feature-flags` | `mcp-server-demo/` | `get_feature_info`, `set_feature_state`, `adjust_traffic_rollout` over `mcp-server-demo/src/features.json` |

Both servers run via the package-local `tsx` (no separate build step). Requirements for `project-docs`: a running Qdrant on `http://localhost:6333` and Ollama on `http://localhost:11434` with the `bge-m3` (embeddings) and optionally `qwen2.5:1.5b` (RU→EN rewrite) models pulled. Design notes: `docs/superpowers/specs/2026-05-04-mcp-server-rag-design.md`.

## License

The MIT License

Copyright (c) 2020 Traversy Media https://traversymedia.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
