# MethodGenerator Widget & Page Development Guide

This document explains **how to create widgets and pages in MethodGenerator**, how to compose them, and how to connect them
to `actions.js`. The goal is **professional, scalable, and fully flexible site generation**, without limiting what applications
you can build.

---

## 1) Widgets

### 1.1 Purpose

A **widget** is a self-contained UI element + logic unit that can:

* Fetch data (GET queries)
* Send data (POST/PUT/PATCH/DELETE actions)
* Render itself
* Update store or page state

Widgets are **reusable**, composable, and independent of pages.

---

### 1.2 Location & Naming

Recommended folder structure:

```
frontend/ui/widgets/
    messenger/get_chats_list.yaml
    messenger/messages_list.yaml
    messenger/send_message_form.yaml
    calculator/input_form.yaml
```

Naming rules:

* `service_name/endpoint_name` → ensures uniqueness
* lowercase, underscores
* file extension `.yaml`

---

### 1.3 Widget Structure

#### A) Query widget (GET)

```yaml
type: query
endpoint: service.endpoint
autoload: true|false       # true → load immediately on widget init
storeAs: store_key         # optional, saves result in store
params: # map endpoint params to sources
  param_name:
    source: input|state|session|route|query|constant
    key: key_name           # key in the source
render:
  type: list|text|container|custom
  fromStore: store_key      # optional
  item: # for lists
    type: button|text|container
    props:
      text: "{{field_name}}"
    onClick:
      - type: runWidget
        widget: widget_path
      - type: setState
        key: key_name
        value: "{{field}}"
```

#### B) Action widget (POST/PUT/DELETE)

```yaml
type: action
endpoint: service.endpoint
payload:
  param_name:
    source: input|state|session|constant
    key: key_name
onSuccess:
  - type: runWidget
    widget: widget_path  # refresh another widget
  - type: clearInput
    key: key_name
render:
  type: container
  children:
    - type: input
      key: input_name
      props:
        placeholder: "Type here"
    - type: button
      props:
        text: Send
      onClick:
        - type: runSelf       # execute this action
```

---

### 1.4 Source Mapping Recap

| source   | Use for                                                  |
|----------|----------------------------------------------------------|
| input    | user-typed values (forms, search, checkboxes)            |
| state    | UI selections (selected chat, active tab, page, filters) |
| session  | persistent identity/session data (user_id, token)        |
| route    | URL parameters (`/chat/15`)                              |
| query    | query string (`?page=2`)                                 |
| constant | fixed values (`limit=20`)                                |
| store    | cached API results from other widgets                    |
| computed | derived values from other sources (`page * limit`)       |
| cookie   | CSRF token or cookie-required data                       |
| header   | HTTP headers (Authorization, X-CSRF-Token)               |

---

### 1.5 Best Practices

1. Keep **widget YAML minimal**: logic + rendering, **no hardcoded layouts**.
2. Always use `storeAs` if data will be reused.
3. Use `autoload` only when widget should fetch immediately.
4. Avoid putting widgets inside page.yaml fully; use **widget references**.

---

## 2) Pages

### 2.1 Purpose

A **page** is a layout container referencing widgets. It:

* Arranges widgets visually
* Defines containers, grids, flex layout
* Can have static text, headers, or images
* Never contains endpoint-specific logic (use widgets for that)

---

### 2.2 Location & Naming

```
frontend/ui/pages/
    messenger_app.yaml
    calculator_app.yaml
```

Naming rules:

* descriptive, lowercase
* `.yaml` extension
* one page per file
* do not embed full widget definitions here

---

### 2.3 Page Structure

```yaml
type: page
title: Page Title
layout: vertical|horizontal
children:
  - type: container
    props:
      class: sidebar
    children:
      - widget: messenger.get_chats_list
  - type: container
    props:
      class: content
    children:
      - widget: messenger.messages_list
      - widget: messenger.send_message_form
```

**Rules:**

1. Each `widget:` reference **points to a widget YAML file**.
2. Use containers (`vertical`, `horizontal`, `grid`) to define layout.
3. Widgets handle API + rendering; pages only compose them.

---

### 2.4 Advanced Page Features

* Nested containers:

```yaml
children:
  - type: container
    layout: vertical
    children:
      - widget: widget1
      - widget: widget2
```

* Widget updates via `onClick` or `onSuccess` chains:

```yaml
- widget: messenger.get_chats_list
  onWidgetUpdate:
    - runWidget: messenger.messages_list
```

* Autoload widgets on page load are triggered automatically; no need for user click.

---

### 2.5 Best Practices

1. **Pages reference widgets, never embed them**.
2. Name containers semantically (`sidebar`, `header`, `content`).
3. Keep pages declarative: layout + widget placement.
4. Complex logic belongs in widget YAML or backend service.

---

## 3) Workflow Example

1. **Define backend endpoint** in FastAPI (`messenger.get_chats`).
2. **Define widget YAML**:

    * Maps endpoint params → `source`
    * Defines rendering and state updates
3. **Define page YAML**:

    * References widget(s)
    * Organizes layout
4. **Runtime loads page.yaml**

    * Fetches widgets
    * Runs `autoload` queries
    * Updates store/state
    * Renders UI

---

## 4) Advantages of this System

1. **Separation of concerns**

    * Pages = layout
    * Widgets = API + rendering
    * Actions = API contract

2. **Reusability**

    * Any widget can be used on multiple pages

3. **Scalability**

    * Add new pages by combining existing widgets
    * Add new widgets independently

4. **No limitations**

    * Supports GET/POST, complex state chains, nested containers
    * Can be extended with custom JS if needed

5. **Rapid development**

    * Once backend endpoints exist, UI is mostly YAML
    * Minimal repetitive coding

---

If you want, I can now **draw a visual folder & file tree** showing the ideal **widgets/pages/actions.js structure** for a full
project, so you can see how MethodGenerator “assembles” a website. This will be professional, fully scalable, and ready for
multiple apps. Do you want me to do that next?
