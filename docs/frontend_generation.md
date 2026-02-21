# UI Runtime & API-Driven Frontend Generation

This project is a **website creation system**, not a single website.

Goal: generate and run web UI with **minimal boilerplate**, where behavior is driven by **API actions + state**, not by writing
custom JS for every button.

---

## Core Concept

### API = what the app can do

### Pages = where the user is in the flow

A single API service can produce multiple pages.  
Pages do not depend on the number of services.

Examples:

- `auth` service can produce: `/login`, `/register`, `/profile`
- `shop` service can produce: `/catalog`, `/product/:id`, `/cart`

---

## Runtime Architecture

The web UI consists of three layers:

1. **Generated HTML pages**
2. **Generated API actions registry (`actions.js`)**
3. **Universal runtime engine (`runtime.js`)**

### Pages

- Stored as plain `.html`
- Contain UI components with attributes like:
    - `data-bind="field_name"`
    - `data-endpoint="service.action"`

Pages should not contain custom logic per button.

### actions.js

Generated from backend API.
Contains action definitions like:

```js
window.ACTIONS = {
  "auth.login": {
    "method": "POST",
    "url": "/auth/login/",
    "service_id": "auth",
    "payload": ["email", "password"],
    "encoding": "json"
  }
};
```

### runtime.js

A universal JS engine that:

* Collects payload from UI (`data-bind`)
* Calls API endpoints from `window.ACTIONS`
* Updates global state
* Applies universal rules (redirects, errors, UI updates)

---

## Behavior Model (State-Driven)

The runtime must follow the rule:

**API response → update STATE → UI reacts**

No custom JS per button.

### Typical flow

1. User clicks a button (`data-endpoint="auth.login"`)
2. runtime collects payload from `data-bind` inputs
3. runtime calls API using `fetch()`
4. runtime updates global `STATE`
5. runtime triggers UI behavior (redirect, show error, etc.)

---

## Redirect-Based Navigation

This system uses **multipage HTML generation**.

After an API call, navigation should happen through **redirect rules**, not custom JS.

Example:

* `auth.login` success → redirect to `/profile`
* `auth.logout` success → redirect to `/login`

---

## System Modes

The runtime must work in 3 valid modes.

---

### 1) Static-only mode (0 API services)

No backend connected.

* `actions.js` is empty or not included
* Pages still render normally
* runtime still works as UI engine:

  * can read/write `data-bind`
  * can support redirects via static links
  * can show local UI changes if implemented

This mode is required for:

* landing pages
* documentation sites
* prototypes

---

### 2) API-driven mode (1+ API services)

Backend services are connected.

* `actions.js` is generated from API
* runtime can call endpoints and drive flows
* pages can be generated based on API structure

Important:

* **1 service ≠ 1 page**
* A single service can produce many pages

---

### 3) Landing-only mode (single page)

A single-page website is still supported.

Possible configurations:

* **Pure static landing**: no API
* **Landing + API**: one page calls actions like `leads.create`

Example:

* `/` contains a form
* submit triggers `leads.create`
* on success: show success state or redirect to `/thank-you`

---

## Pages vs. Services

### Services

* Provide actions: `service.action`
* Define payload structure and HTTP method
* Are discoverable via backend inspection

### Pages

* Represent user flow steps
* Can exist without services
* Are not limited by the number of services

---

## Minimum Recommended Pages

Even with **0 API services**, the project should support:

* `/` (index)
* `/404` (not found)
* `/debug/state` (optional but highly useful for development)

With an `auth` service, typical generated pages:

* `/login`
* `/register`
* `/profile`

---

## Principles

* Minimal boilerplate
* No per-button custom JS
* Behavior is defined by:

  * API action registry (`actions.js`)
  * state updates
  * universal runtime rules
* Multi-page navigation via redirects
* Works with 0, 1, or many services

---
