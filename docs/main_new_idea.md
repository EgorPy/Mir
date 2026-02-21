# MethodGenerator Widget & Page Guidelines

This document describes **how to create widgets and pages in MethodGenerator**, the types of widgets, their logic, and the
generation process. It is written for developers to **build reusable, flexible, and maintainable UIs**.

---

## 1. Types of Widgets

Widgets can be divided into **three main types**:

1. **Immediate Result Widgets**

    * Display results directly after user input.
    * Example: calculator where the result updates instantly when the user types numbers.
    * Minimal logic needed, usually only local input processing.

2. **Processed Input Widgets**

    * Take user input, process it (e.g., via an API), and display the result **without a page reload**.
    * Example: a form that submits a value to the backend and updates a section of the page.
    * Requires a `payload`, `onSuccess` actions, and store/state updates.

3. **GET Request Widgets**

    * Fetch data from an API endpoint (list, details, or filtered content).
    * Example: a chat list, product catalog, or user table.
    * Logic may include sorting, filtering, pagination, or extracting specific values.
    * Results are stored in a widget-local store or state and rendered dynamically.

---

## 2. Widget Declaration

Widgets are defined in YAML and should **contain only the logic and rendering**, not the full page layout. Pages reference widgets
to define layout.

**Basic container structure:**

```yaml
type: container
layout: vertical
children:  # populated automatically with the widget’s logic and elements
```

**Notes:**

* `children` are generated dynamically based on widget logic written by the developer.
* Widgets should never contain hardcoded pages; they are **modular, reusable units**.

---

## 3. When to Generate Widgets and Pages

1. **Only if they do not already exist**

    * Prevents accidental overwriting during development.
    * Existing widgets/pages can be regenerated **only by explicit developer command**.

2. **Endpoint-driven development**

    * Developer first writes the backend API.
    * Each endpoint is independent and may not yet be connected to any page.
    * Widgets are later associated with endpoints in YAML files.

---

## 4. Widget and Page Generation Process

The process follows a consistent flow:

1. **API Definition**

    * Backend endpoints are implemented (FastAPI, etc.).

2. **Actions Generation**

    * `actions.js` is generated based on backend endpoints.
    * Each action describes HTTP method, URL, parameters, and optional success behavior.

3. **Widget YAML Creation**

    * Developer specifies which action the widget uses.
    * Defines `params`, `payload`, `source` (UI/state/persistent/external), rendering, and store/state behavior.

4. **HTML Generation**

    * HTML is generated for the widget based on the YAML.
    * Widgets render dynamically without reloading the entire page.

5. **Page Composition**

    * Pages reference existing widgets in YAML.
    * Pages define **layout only**: containers, columns, grids, or flex layout.
    * Logic stays inside the widget; pages are purely compositional.

**Key principle:**

* **Endpoints → actions.js → widget YAML → widget HTML → pages**
* Pages **do not generate logic themselves**; they assemble widgets.

---

## 5. Best Practices

1. **Separate logic from layout**

    * Widgets handle API + rendering.
    * Pages handle layout only.

2. **Use widgets as building blocks**

    * Each widget is modular and reusable.
    * Multiple pages can reference the same widget.

3. **Avoid automatic overwriting**

    * Generation occurs only for non-existing widgets/pages or via explicit regeneration command.

4. **Follow the three widget types**

    * Immediate result, processed input, or GET request.
    * Choose appropriate `source` for each parameter: `input`, `state`, `persistent`, `external`.

5. **Keep pages declarative**

    * Do not include API calls inside page YAML.
    * Only reference widgets and arrange layout.
