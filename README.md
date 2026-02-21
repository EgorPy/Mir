# MethodGenerator

MethodGenerator is a **full-stack UI generation framework** that automates the creation of web pages from backend API endpoints.
It provides a flexible system to attach additional UI elements via YAML while preserving the core form generated from the API.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Core Concept](#core-concept)
3. [Workflow](#workflow)
4. [YAML Elements and Decorations](#yaml-elements-and-decorations)
5. [Process Overview](#process-overview--generation-flow)
6. [Zones and Layouts](#zones-and-layouts)
7. [CSS and Styling](#css-and-styling)
8. [Runtime Behavior](#runtime-behavior-runtimejs)
9. [Extending MethodGenerator](#extending-methodgenerator)
10. [Testing](#testing)

---

## Project Structure

```
backend/
  backend_main.py
  __init__.py
  services/
    auth/
      service.py
      __init__.py
      api/
        auth.py
      logic/
        auth_logic.py
        security.py

core/
  build_site.py
  config.py
  core_main.py
  generate_config_js.py
  logger.py
  main.py
  method_generator.py
  redirects.py
  registry.py
  service_loader.py
  task.py
  actions_generation/
    actions_parser.py
    action_model.py
    api_inspector.py
    generate_actions_js.py
  html_generation/
    element_types.yaml
    generate_node_html.py
    login_example.yaml
    node_registry.py
    ui_enums.py
    ui_node.py
    yaml_parser.py

frontend/
  frontend_main.py
  ui_yaml/
    auth_login.yaml
    auth_login_decoration.yaml
    auth_register.yaml
    ...
  web/
    pages/
      auth_login.html
      profile.html
      ...
    static/
      actions.js
      runtime.js
      ui_error_toast.css
      ...
```

* **backend/**: main backend logic, services, and API endpoints.
* **core/**: the engine of MethodGenerator (site building, HTML/YAML generation, actions parsing, runtime config).
* **frontend/**: generated UI YAML, pages, static assets.
* **RectPacker/**: legacy HTML layout utilities.
* **tests/**: test scripts for backend, frontend, and runtime.

---

## Core Concept

1. The **central form** is generated automatically from backend API endpoints.
   Each endpoint’s payload fields are converted into form inputs.
2. Additional UI elements (headers, footers, banners, sidebars, text, etc.) are provided as **decoration YAML files**.
3. **The form always stays in the center** of the page; additional elements are rendered around it without breaking its layout.
4. Runtime logic handles fetching, submission, error handling, and dynamic updates for a fully interactive page.

---

## Workflow

1. **API Definition**: Define endpoints in FastAPI. Include payload fields and optional redirect behavior.
2. **Actions JS Generation**: Use `generate_actions_js.py` to convert backend endpoints into `actions.js`.
3. **YAML Generation**: `actions_parser.py` converts `actions.js` into base YAML forms for the frontend.
4. **Decoration YAMLs**: Place additional YAML files in `frontend/ui_yaml/extra_ui/` and use `_decoration.yaml` suffix.
5. **Page Generation**: `generate_page_from_ui_tree()` renders HTML pages automatically including CSS files, JS scripts, and UI
   elements.
6. **Runtime Handling**: `runtime.js` handles:

    * Collecting input values
    * Fetching backend endpoints
    * Displaying errors via toast or inline elements
    * Success redirects and dynamic rendering

---

## YAML Elements and Decorations

* **Main form YAML**: `<form_name>.yaml` (e.g., `auth_login.yaml`)
* **Decoration YAML**: `<form_name>_decoration.yaml` and placed in `frontend/ui_yaml/extra_ui/`
  These files define additional UI elements to render **around or relative to the form**.

### Example Main Form

```yaml
type: container
layout: vertical
children:
  - type: text_input
    bind: email
    props:
      placeholder: "Email"
  - type: text_input
    bind: password
    props:
      placeholder: "Password"
      type: password
  - type: button
    action: submit
    endpoint: auth.login
    props:
      text: "Submit"
```

### Example Decoration

```yaml
type: container
props:
  position: form-top
  layout: vertical
children:
  - type: h1
    props:
      text: "Welcome Back!"
  - type: h3
    props:
      text: "Please enter your credentials below"
```

* Decorations are automatically merged with the main form **based on filename prefix**.
* If no decoration exists, the main form is still rendered normally.
* Decorations must define `props.position` to indicate placement.

---

## Process Overview / Generation Flow

1. Load **main YAML forms** from `frontend/ui_yaml/`.
2. Search for **matching decoration YAMLs** (`*_decoration.yaml`).
3. Merge decoration elements by `props.position`.
4. Generate HTML pages in `frontend/web/pages/`.
5. Serve pages with static CSS and JS.

---

## Zones and Layouts

* **Form-relative zones**: `form-top`, `form-bottom`, `form-left`, `form-right`
* **Page-relative zones**: `page-top-left`, `page-top-right`, `page-bottom-left`, `page-bottom-right`
* Each zone supports multiple elements, horizontally or vertically stacked (`props.layout`).

---

## CSS and Styling

* Each element type can have a corresponding CSS file (`button.css`, `ui_error_toast.css`, etc.).
* CSS files are automatically included if present in `frontend/web/static`.
* Inline styles (`props.style`) and classes (`props.class`) can be used for customization.

---

## Runtime Behavior (`runtime.js`)

* Collects values from `data-bind` inputs.
* Calls backend endpoints defined in `actions.js`.
* Displays **error toasts** or messages based on status codes.
* Handles **redirects** on success.
* Updates bound elements dynamically without a page reload.

---

## Extending MethodGenerator

1. **Add new YAML elements**: Create a YAML file with `type`, `props`, and `children`.
2. **Add decoration YAMLs**: Optionally, create `<form_name>_decoration.yaml` to render extra UI around forms.
3. **Add CSS**: Name your CSS file after the element type and place it in `frontend/web/static`.

---

## Testing

* **Legacy tests**: Located in `tests/` and `RectPacker/tests/`.
* Test API YAML generation, runtime behavior, UI rendering, and HTML output.
* Example: `ui_runtime_test.py` manually generates `actions.js` by inspecting FastAPI router.
