# UI Zones Around Form

This documentation describes the system for adding additional UI elements around a form generated from the API using YAML
elements.

## 1. Core Concept

* The **form** is always located at the center of the page. This is the main YAML generated from `actions.js`.
* **Additional elements** are added as separate YAML files.
* **Elements can be placed around the form** or relative to the page without breaking the form structure.
* Each zone can contain **multiple elements** and have a **layout**: `horizontal` or `vertical`.

---

## 2. Zones Around the Form

| Zone                | Placement         | Default Layout        | Example Elements               |
|---------------------|-------------------|-----------------------|--------------------------------|
| `form-top`          | Above the form    | vertical              | Headings, instructions, tips   |
| `form-bottom`       | Below the form    | horizontal            | Buttons, links, tips           |
| `form-left`         | Left of the form  | vertical              | Text tips, icons               |
| `form-right`        | Right of the form | vertical              | Text tips, icons               |
| `page-top-left`     | Page corner       | horizontal / vertical | Toasts, notifications, banners |
| `page-top-right`    | Page corner       | horizontal / vertical | Toasts, notifications, banners |
| `page-bottom-left`  | Page corner       | horizontal / vertical | Toasts, notifications, banners |
| `page-bottom-right` | Page corner       | horizontal / vertical | Toasts, notifications, banners |

> **The form always stays in the center**; elements in zones should not modify the order of form fields.

---

## 3. YAML Structure

Example of adding text above the form:

```yaml
type: container
props:
  position: form-top
  layout: vertical
children:
  - type: h1
    props:
      text: "Login"
  - type: h3
    props:
      text: "Please enter your credentials"
```

Example of multiple elements around the form:

```yaml
type: container
props:
  position: form-right
  layout: vertical
children:
  - type: h3
    props:
      text: "Tip 1"
  - type: h3
    props:
      text: "Tip 2"

type: container
props:
  position: form-left
  layout: vertical
children:
  - type: h3
    props:
      text: "Instruction A"
  - type: h3
    props:
      text: "Instruction B"
```

---

## 4. Page Generation Algorithm

1. Load the **main YAML form** → center of the page.
2. Load **additional YAML elements** (extra UI) from `frontend/ui_yaml/extra_ui`.
3. Merge additional elements with the form based on `props.position`.
4. Render each zone:

* `form-top` / `form-bottom` → vertical or horizontal flex above/below the form.
* `form-left` / `form-right` → vertical flex left/right of the form.
* Corner zones → absolute / fixed containers, layout is specified in props.
* The center form remains unchanged.

---

## 5. Advantages

* Supports text **above and around the form**.
* Allows adding **any number of elements** to any zone.
* The form center is always safe; API logic is not broken.
* Easy to extend with new YAML elements.
* Supports horizontal and vertical layout for each zone.

---

## 6. Examples of Elements Around the Form and Page Corners

### 6.1 Elements Around the Form

**Above the form (`form-top`)**

```yaml
type: container
props:
  position: form-top
  layout: vertical
children:
  - type: h1
    props:
      text: "Login"
  - type: h3
    props:
      text: "Please enter your credentials"
  - type: p
    props:
      text: "You can use your email or username"
```

**Below the form (`form-bottom`)**

```yaml
type: container
props:
  position: form-bottom
  layout: horizontal
children:
  - type: button
    props:
      text: "Submit"
      class: "primary-button"
  - type: button
    props:
      text: "Cancel"
      class: "secondary-button"
  - type: a
    props:
      text: "Forgot password?"
      href: "#"
```

**Left of the form (`form-left`)**

```yaml
type: container
props:
  position: form-left
  layout: vertical
children:
  - type: h3
    props:
      text: "Tip 1: Use a strong password"
  - type: h3
    props:
      text: "Tip 2: Keep your email safe"
  - type: img
    props:
      src: "/static/icons/security.png"
      alt: "Security icon"
```

**Right of the form (`form-right`)**

```yaml
type: container
props:
  position: form-right
  layout: vertical
children:
  - type: h3
    props:
      text: "Need help?"
  - type: button
    props:
      text: "Support"
      class: "support-button"
  - type: ui-error-toast
```

---

### 6.2 Elements in Page Corners

**Top-left corner (`page-top-left`)**

```yaml
type: container
props:
  position: page-top-left
  layout: vertical
children:
  - type: ui-notification
    props:
      text: "New update available!"
  - type: h3
    props:
      text: "Welcome back!"
```

**Top-right corner (`page-top-right`)**

```yaml
type: container
props:
  position: page-top-right
  layout: horizontal
children:
  - type: ui-error-toast
  - type: button
    props:
      text: "Retry"
      class: "retry-button"
```

**Bottom-left corner (`page-bottom-left`)**

```yaml
type: container
props:
  position: page-bottom-left
  layout: vertical
children:
  - type: h3
    props:
      text: "Tip of the day:"
  - type: p
    props:
      text: "Check your profile settings regularly."
```

**Bottom-right corner (`page-bottom-right`)**

```yaml
type: container
props:
  position: page-bottom-right
  layout: horizontal
children:
  - type: ui-notification
    props:
      text: "You have 3 unread messages"
  - type: button
    props:
      text: "Open Inbox"
      class: "inbox-button"
```

---

### 7. Sidebars and Distance from the Form

#### 7.1 `form-left` / `form-right`

* These zones are **directly next to the form** (left or right).
* **Default behavior:** the container hugs the form with minimal spacing.
* **Use case:** tips, small menus, icons, or helper elements that should stay close to the form.
* **Width and spacing:** controlled via `props.style` (e.g., `width`, `margin`).

Example:

```yaml
type: container
props:
  position: form-left
  layout: vertical
  style:
    width: 150px
    padding: 8px
children:
  - type: h3
    props:
      text: "Tip 1"
  - type: h3
    props:
      text: "Tip 2"
```

#### 7.2 Full Sidebars to the Edge of the Screen

* For a **sidebar stretching from top to bottom or from the edge of the page**, use a **page-level zone**:

    * `page-top-left`, `page-bottom-left`, or a new `page-left` zone.
* **Positioning:** absolute or fixed via `props.style` to extend to the page edge without affecting the central form.
* **Use case:** full navigation menus, notification panels, or large vertical content.

Example:

```yaml
type: container
props:
  position: page-left
  layout: vertical
  style:
    width: 250px
    height: 100vh
    position: fixed
    top: 0
    left: 0
    background-color: "#f5f5f5"
    padding: 12px
children:
  - type: h3
    props:
      text: "Dashboard"
  - type: button
    props:
      text: "Profile"
  - type: button
    props:
      text: "Settings"
  - type: button
    props:
      text: "Logout"
```

> This sidebar **does not interfere with the central form** and spans the entire left edge of the screen.

---

### 7.3 Recommendation

| Zone type                  | Use case                                 | Positioning                                                     |
|----------------------------|------------------------------------------|-----------------------------------------------------------------|
| `form-left` / `form-right` | Small tips, helper elements, minor menus | Hug the form; flexible width via style                          |
| `page-left` / `page-right` | Full sidebar, navigation, notifications  | Absolute or fixed to the page edge; does not affect form center |

> Central form always remains in the middle of the page; adding sidebars or elements around it **never breaks API-generated layout
**.

## 8. Automatic Form and Decoration Matching

The site generation system can automatically merge **main form YAML** with **decoration YAML** based on file naming conventions.
This allows developers to create additional UI elements around forms without manually specifying them.

### 8.1 Naming Convention

* **Main form YAML:**

  ```
  <form_name>.yaml
  ```

  Example: `auth_login.yaml`

* **Decoration YAML:**

  ```
  <form_name>_decoration.yaml
  ```

  Example: `auth_login_decoration.yaml`

> The system matches the **prefix before `_decoration`** with the main form name.
> If a decoration file exists, it will be
> automatically merged with the form when generating HTML.

---

### 8.2 Example

**Main form:** `auth_login.yaml`

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

**Decoration:** `auth_login_decoration.yaml`

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

**Result:**

* The main form stays centered.
* The decoration is automatically placed **above the form** (`form-top`) according to `props.position`.

### Example HTML

```html
<!--Additional UI from ui_yaml/extra_ui-->
<h1 class="h1" style="text-align:center; margin-bottom:4px" text="Login">Login</h1>
<div class="container" style="display:flex; flex-direction:row">
    <h3 class="h3 gray-text" style="" text="No account?">No account?</h3>
    <a class="a" href="/auth_register" style="" text="Register">Register</a>
</div>
<!--Generated form from ui_yaml-->
<div class="container" style="display:flex; flex-direction:column">
    <input class="text-input" data-bind="email" placeholder="email" style="" type="text">
    <input class="text-input" data-bind="password" placeholder="password" style="" type="password">
    <button class="button" data-action="submit" data-endpoint="auth.login" style="" text="Submit" type="button">Submit</button>
</div>
```

---

### 8.3 Rules for Developers

1. **Prefix match:**

    * The decoration YAML filename must start with the exact main form name.
    * Add `_decoration` before `.yaml`.

2. **Optional decorations:**

    * If no decoration file exists for a form, the form will still be generated normally.
    * This allows incremental addition of decorations without breaking site generation.

3. **Positioning:**

    * Each decoration YAML must have `props.position` to define its placement.
    * Supported positions: `form-top`, `form-bottom`, `form-left`, `form-right`, `page-top-left`, etc.

4. **Multiple decorations:**

    * You can create several decoration files for the same form using distinct suffixes:

      ```
      auth_login_decoration.yaml
      auth_login_sidebar.yaml
      ```
    * The system merges all decorations **by position** automatically.

---

### 8.4 Implementation Note

* The build script (`build_site()`) scans `frontend/ui_yaml` for main forms and `frontend/ui_yaml/extra_ui` for decorations.
* Decorations are applied **only if a matching file exists**.
* Merging respects `props.position`, so the central form is never moved or modified.

---

> This approach ensures that additional UI elements can be added or updated independently of the main form, maintaining a **clean
separation between form logic and decorative UI**.
