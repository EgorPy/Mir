# MethodGenerator Value Sources (Reference)

This document defines **how MethodGenerator fills endpoint parameters and payload fields** using `source` mappings in widget YAML.

It is designed to be **predictable**, **framework-agnostic**, and **non-restrictive**.

---

## 1) What `source` Is

A `source` tells MethodGenerator **where to read a value from** when executing a widget:

* **Query widget** (`GET`) → fills `params`
* **Action widget** (`POST/PUT/PATCH/DELETE`) → fills `payload`

### Example

```yaml
params:
  chat_id:
    source: state
    key: selected_chat_id
```

Meaning:

* endpoint expects `chat_id`
* runtime reads it from `state.selected_chat_id`

---

## 2) Where `source` Is Used

### 2.1 Query widget (GET)

```yaml
type: query
endpoint: messenger.get_messages
storeAs: messages
params:
  chat_id:
    source: state
    key: selected_chat_id
```

### 2.2 Action widget (POST)

```yaml
type: action
endpoint: messenger.send_message
payload:
  text:
    source: input
    key: message_text
```

---

## 3) Supported `source` Types

### 3.1 `source: input`

Use when the value is typed/selected by the user in UI fields.

Typical cases:

* form inputs (`email`, `password`, `name`)
* message text (`text`)
* calculator values (`value1`, `value2`)
* search string (`query`)
* checkbox/radio selection (`is_active`, `role`)

#### Mapping

```yaml
payload:
  text:
    source: input
    key: message_text
```

Runtime reads:

* `inputs["message_text"]`

#### Notes

* `key` must match an input element key in UI.
* input values are typically strings unless the runtime casts them.

---

### 3.2 `source: state`

Use when the value is **UI state**: selected item, tab, filter, page, etc.

Typical cases:

* selected chat id (`selected_chat_id`)
* selected product id
* pagination (`page`, `offset`)
* sorting (`sort_by`, `sort_dir`)
* currently open modal id
* any transient UI state

#### Mapping

```yaml
params:
  chat_id:
    source: state
    key: selected_chat_id
```

Runtime reads:

* `state["selected_chat_id"]`

#### Notes

* State is reset when the page reloads (unless you explicitly persist it).
* Use `state` for values produced by `setState` actions.

---

### 3.3 `source: session`

Use when the value must persist across pages and reloads during the authenticated session.

Typical cases:

* `user_id`
* `session_id`
* auth token (if stored in session)
* user role/permissions
* workspace id if it’s global for the logged-in user

#### Mapping

```yaml
params:
  user_id:
    source: session
    key: user_id
```

Runtime reads:

* `sessionStorage["user_id"]` (or cookies, depending on runtime)

#### Notes

* Do **not** store transient UI state here.
* Session values should represent **identity/session context**, not page-specific selections.

---

### 3.4 `source: route`

Use when the value comes from the URL.

Typical cases:

* `/chats/{chat_id}`
* `/users/{user_id}`
* `/orders/{order_id}`

#### Mapping

```yaml
params:
  chat_id:
    source: route
    key: chat_id
```

Runtime reads:

* route params extracted from URL (router-dependent)

#### Notes

* Requires routing support in runtime.
* This is the correct source for “details pages”.

---

### 3.5 `source: query`

Use when the value comes from the browser query string.

Typical cases:

* `?page=2`
* `?q=python`
* `?tab=profile`

#### Mapping

```yaml
params:
  q:
    source: query
    key: q
```

Runtime reads:

* `new URLSearchParams(location.search).get("q")`

#### Notes

* Useful for deep-linking search/filter state.
* Prefer `state` for internal navigation, prefer `query` for shareable URLs.

---

### 3.6 `source: constant`

Use when the value is fixed and does not depend on user input.

Typical cases:

* `limit: 50`
* `sort_dir: "desc"`
* `include_archived: false`

#### Mapping

```yaml
params:
  limit:
    source: constant
    value: 50
```

Runtime reads:

* `value` directly

#### Notes

* `constant` uses `value`, not `key`.

---

### 3.7 `source: cookie`

Use when backend authentication/session depends on cookies, but you still need a value explicitly.

Typical cases:

* CSRF token
* custom cookie-based session keys

#### Mapping

```yaml
payload:
  csrf_token:
    source: cookie
    key: csrf_token
```

Runtime reads:

* cookie value by name

#### Notes

* Most APIs don’t need explicit cookie values because cookies are automatically sent by the browser.
* Use only if the API requires a cookie value inside request body/headers.

---

### 3.8 `source: header`

Use when a value must be placed in request headers.

Typical cases:

* `Authorization: Bearer <token>`
* `X-API-Key`
* `X-CSRF-Token`

#### Mapping

```yaml
headers:
  Authorization:
    source: session
    key: access_token
    format: "Bearer {value}"
```

Runtime builds:

* `Authorization = "Bearer " + access_token`

#### Notes

* This is typically handled by runtime globally.
* If supported per-widget, it must be documented as part of the widget schema.

---

### 3.9 `source: store`

Use when a value comes from previously fetched data stored in the widget store.

Typical cases:

* use first chat from chats list
* use object fields from previously loaded profile

#### Mapping

```yaml
params:
  chat_id:
    source: store
    key: chats[0].id
```

Runtime reads:

* `store["chats"][0].id`

#### Notes

* Requires a path resolver (dot/bracket notation).
* Only use when you intentionally depend on cached data.

---

### 3.10 `source: computed`

Use when the value must be derived from other sources via a simple expression.

Typical cases:

* `offset = page * limit`
* `full_name = first_name + " " + last_name`

#### Mapping

```yaml
params:
  offset:
    source: computed
    expr: "state.page * constant.limit"
```

#### Notes

* Keep computed logic small.
* Anything complex should be done in custom JS, not YAML.

---

## 4) How to Choose the Correct `source` (Rules)

### Rule A: If user types it → `input`

If it comes from a field, checkbox, dropdown, textarea:

* use `source: input`

---

### Rule B: If user selects it on the page → `state`

If it changes because of UI actions (`onClick`, tab selection, list item selection):

* use `source: state`

Example: `selected_chat_id`, `selected_user_id`

---

### Rule C: If it identifies the logged-in user/session → `session`

If it must exist across pages and reloads and belongs to auth/session context:

* use `source: session`

Example: `user_id`, `session_id`, `access_token`

---

### Rule D: If it comes from URL → `route` or `query`

* `/items/15` → `route`
* `?page=2` → `query`

---

### Rule E: If it never changes → `constant`

Fixed limits, default sorting, flags.

---

### Rule F: If it comes from already fetched data → `store`

Only when explicitly needed.

---

## 5) Examples (Real Use Cases)

### 5.1 Messenger: load chats on page open

```yaml
type: query
endpoint: messenger.get_chats
autoload: true
storeAs: chats
params:
  user_id:
    source: session
    key: user_id
```

Why:

* `user_id` is part of identity/session context.

---

### 5.2 Messenger: load messages after selecting a chat

```yaml
type: query
endpoint: messenger.get_messages
storeAs: messages
params:
  chat_id:
    source: state
    key: selected_chat_id
```

Why:

* `chat_id` is a UI selection.

---

### 5.3 Messenger: send message

```yaml
type: action
endpoint: messenger.send_message
payload:
  chat_id:
    source: state
    key: selected_chat_id
  text:
    source: input
    key: message_text
```

Why:

* `chat_id` is selected chat
* `text` is typed message

---

### 5.4 Calculator: calculate result from two inputs

```yaml
type: action
endpoint: calculator.calculate
payload:
  value1:
    source: input
    key: value1
  value2:
    source: input
    key: value2
```

---

### 5.5 Pagination: GET list with query string support

```yaml
type: query
endpoint: posts.list
autoload: true
storeAs: posts
params:
  page:
    source: query
    key: page
  limit:
    source: constant
    value: 20
```

---

## 6) Validation Rules (What Must Be Enforced)

A runtime or validator should enforce:

### 6.1 Required fields

If endpoint requires `chat_id`, and resolved value is `null/undefined/""`:

* query/action should fail with a clear UI error
* no request should be sent

### 6.2 Source schema rules

* `input/state/session/route/query/cookie/header/store` require `key`
* `constant` requires `value`
* `computed` requires `expr`

### 6.3 Type casting (optional but recommended)

If API expects integer:

* runtime should cast `"15"` → `15` when safe

---

## 7) What NOT to Do

### Do not use `session` for UI selections

Bad:

* `selected_chat_id` stored in session

Reason:

* session must represent identity context, not page state

---

### Do not use `state` for auth identity

Bad:

* `user_id` stored in state

Reason:

* page reload breaks auth context

---

### Do not hardcode values in page.yaml

Bad:

* page.yaml contains full widget logic

Reason:

* pages must be composition-only to stay scalable

---

## 8) Minimal Recommended Set (If You Want to Keep It Simple)

If you want maximum power with minimal complexity, support these first:

* `input`
* `state`
* `session`
* `route`
* `query`
* `constant`

Everything else can be added later without breaking compatibility.

---

## 9) Naming Conventions (Recommended)

### Inputs

* `message_text`
* `email`
* `password`
* `value1`
* `value2`

### State

* `selected_chat_id`
* `active_tab`
* `page`
* `sort_by`

### Session

* `user_id`
* `session_id`
* `access_token`
