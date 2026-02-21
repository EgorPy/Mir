## MethodGenerator — New Idea (Runtime + API-driven UI, without limitations)

### Goal

MethodGenerator is a **full-stack UI acceleration framework** that generates frontend pages and API bindings from backend
services, while still allowing developers to build **any type of application** without being trapped inside a rigid “CRUD-only
generator”.

The main objective is:

- Generate as much boilerplate as possible (pages, forms, API calls, basic UI).
- Provide a small but powerful **UI Runtime** that supports dynamic content and state.
- Allow custom UI/logic at any point without fighting the generator.

This solves the core problem discovered in real usage:

- Many pages are not “click a button → redirect → show result”.
- Real apps require **auto-loading data**, **state-driven rendering**, and **non-destructive updates**.

---

## The Problem We Hit (Why the Old Idea Breaks)

### Example: Messenger

We needed to show `GET /chats` results when the page opens.
Instead, the generated UI required a button click and then redirected to the same page, losing the response.

### Example: Calculator

`POST /calculate` returns JSON, but the generated system has no natural “result page”.
Even if a `/result` page exists, it would need to fetch again or store the result somewhere.

### Root Cause

The old system assumes:

- An endpoint is a “page action”.
- The UI is static HTML.
- Results are not persisted in a page state.

This does not match how real apps behave.

---

## The New Core Concept

### 1) API Endpoints Are Not Pages

Endpoints belong to one of two categories:

#### A) Data Endpoints (Queries)

Usually `GET`.

Purpose:

- Load data into the UI state.
- Render lists, tables, cards, detail views.
- Can run automatically when the page loads.

Examples:

- `GET /auth/me`
- `GET /messenger/chats`
- `GET /messenger/messages?chat_id=...`

#### B) Action Endpoints (Mutations)

Usually `POST/PUT/PATCH/DELETE`.

Purpose:

- Change data (create/update/delete).
- Trigger UI updates (refetch or patch state).
- Should not require full page reloads.

Examples:

- `POST /messenger/create_chat`
- `POST /messenger/send_message`
- `POST /calculator/calculate`

---

## The Missing Piece: UI Runtime

To support real apps, MethodGenerator must include a lightweight runtime (already partially present as `runtime.js`) that
provides:

- A global or page-scoped **state**
- **Autoload** data loaders
- **Reactive rendering** for dynamic blocks
- Standard UX for:
    - loading
    - empty state
    - errors
    - success toasts

### Why Runtime Is Mandatory

Without runtime, generated HTML is static.
Static HTML cannot naturally support:

- “show chats on page open”
- “render results under the form”
- “update list after create/delete”
- “real-time updates”

The runtime allows MethodGenerator to remain minimal while still supporting modern UI behavior.

---

## UI Behavior Rules (New Standard)

### Rule 1 — GET Autoload by Default

If the page has all required parameters available, the runtime should execute GET requests automatically on a page load.

Parameter sources:

- cookies (session)
- URL params/query
- runtime state
- optional localStorage

If required parameters are missing:

- do not crash
- show a friendly “missing parameter” UI block

### Rule 2 — POST/PUT/PATCH/DELETE Do Not Redirect by Default

Mutation endpoints should be handled as inline actions:

- submit form
- receive JSON
- update state and UI immediately

Redirects are still possible, but must be explicit and optional.

### Rule 3 — Results Should Be Displayed Without Extra Pages (when possible)

For actions like calculator:

- show result under the form
- do not require `/result` pages

This removes unnecessary routing and repeated requests.

### Rule 4 — Refetch and State Patching

After a successful mutation, one of the following must happen:

- **refetch** related GET endpoints
- or **patch** the state locally

Example:

- create chat → refetch chats list
- delete chat → remove item from a state list
- send message → append message locally + optional refetch

---

## Generated UI Must Support Dynamic Nodes

We keep HTML generation, but introduce dynamic UI blocks powered by runtime state.

### Minimal Dynamic Elements

- `DynamicText(path)`
- `If(condition)`
- `List(source, template)`
- `Table(source, columns)`
- `ErrorBox(source)`
- `LoadingSpinner(when)`

This is enough to build:

- admin pages
- dashboards
- messenger lists
- calculator results
- “profile/me” pages

---

## Routing Strategy

Generated pages remain static HTML files in `frontend/web/pages`, but they become **runtime-driven pages**.

Two possible page types:

### A) Query Pages (Data pages)

Used for `GET` endpoints.
Example:

- `messenger_get_chats.html`
- autoloads chats and renders a list

### B) Action Pages (Mutation pages)

Used for `POST` endpoints.
Example:

- `calculator_calculate.html`
- shows a form and renders result inline after submitting

---

## Session + Auth Strategy (Important)

To avoid parameter-passing problems (like `user_id`), the preferred backend design is:

- frontend does not send `user_id`
- backend extracts user from session cookie or token

This enables:

- `GET /chats` without parameters
- consistent autoload behavior
- simpler UI generation

If an endpoint still requires parameters:

- runtime tries to resolve them
- otherwise shows a “missing params” state

---

## How This Keeps the System Flexible (No App Limitations)

MethodGenerator must never force the developer into “only generated UI”.

Instead, it should support:

### 1) Generated Core + Custom Extensions

- generated pages work out-of-the-box
- developers can attach extra UI blocks via YAML (`extra_ui`)
- developers can add custom JS logic when needed

### 2) Manual Pages Still Use the Same Runtime + API Client

Even if a page is handwritten:

- it can reuse generated API actions
- it can reuse runtime state/render helpers
- it remains consistent with the rest of the project

### 3) Generator Never Owns the App

The generator should not become a framework that blocks:

- websockets
- realtime updates
- custom layouts
- complex interactions

It should provide defaults, not restrictions.

---

## Implementation Plan (What We Will Build)

### Step 1 — Define a Clear Runtime State Model

Runtime should expose:

- `state`
- `setState(key, value)`
- `patchState(path, value)`
- `render()` or `renderBlock(blockId)`
- `runLoaders()`

### Step 2 — Introduce Autoload Loaders for GET Pages

Each GET page gets a generated loader definition:

- endpoint
- parameter bindings
- target a state key

Example:

- `GET /messenger/chats` → `state.messenger.chats`

### Step 3 — Make Actions Update UI Inline

Each POST page gets generated behavior:

- submit form via fetch
- store response in state
- show success/error
- optionally trigger refetch

Example:

- `POST /calculator/calculate` → `state.calculator.result`

### Step 4 — Add Dynamic Rendering Blocks

HTML generator outputs placeholders like:

- `<div data-mg-list="state.messenger.chats" data-template="chat_item"></div>`
- `<span data-mg-text="state.calculator.result"></span>`

Runtime reads these and renders automatically.

### Step 5 — Add Optional Redirect Behavior

Redirect is allowed, but only if configured:

- `redirect_to: "/result"`
- or `redirect_to: "/messenger/chats"`

Default behavior remains inline.

---

## Expected Developer Experience

### For a Simple App (Calculator)

Developer writes backend endpoint:

- `POST /calculate`

MethodGenerator generates:

- a form page
- inline result rendering
- no extra pages needed

### For a Real App (Messenger)

Developer writes endpoints:

- `GET /chats`
- `GET /messages`
- `POST /send_message`

MethodGenerator generates:

- chat list page with autoload
- message list page with parameter binding
- send message action that updates state/refetches

If the developer wants a custom messenger layout:

- they create a manual page
- and reuse generated API + runtime

---

## Current Project Structure

The existing structure is mostly compatible with the new idea.
We do not need a full rewrite.

### Backend

- `backend/services/*/api/*.py` stays as-is
- `backend/services/*/logic/*.py` stays as-is

### Core

- `core/actions_generation/` remains responsible for generating `actions.js`
- `core/html_generation/` remains responsible for generating HTML from YAML
- `core/yaml_generation/` remains responsible for producing default YAML

### Frontend

- `frontend/ui_yaml/` remains the main source of UI definitions
- `frontend/ui_yaml/extra_ui/` remains the extension mechanism
- `frontend/web/static/runtime.js` becomes the key runtime engine
- `frontend/web/static/actions.js` becomes the API/action layer

---

## What We Will NOT Do

To keep MethodGenerator lightweight and not limiting:

- We will not rebuild React/Vue.
- We will not enforce a single page layout.
- We will not require every page to be generated.
- We will not force “one endpoint = one page” forever.

Generated pages are a starting point, not a prison.

---

## Summary

MethodGenerator becomes a system that:

- generates UI + API bindings fast
- supports real-world dynamic pages via runtime state
- autoloads GET data on page open
- handles POST results inline by default
- supports refetch/state patching after actions
- allows manual customization without breaking the framework

This keeps development fast while still allowing any application complexity when needed.
