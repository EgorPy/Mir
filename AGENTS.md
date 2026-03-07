# AGENTS.md

## Global Rules

1. Use English only for all code and comments.
2. Use English only for all documentation.
3. Use K&R / 1TBS brace style for blocks:

```js
function test() {
    console.log("Hello, world")
}
```

4. Do not use brace style where opening braces are on a new line:

```js
function test()
{
    console.log("Hello, world")
}
```

5. Do not use single-line block style for functions/blocks:

```js
function test() { console.log("Hello, world") }
```

6. Never commit files that are listed in `.gitignore`.
7. Follow DRY (Don't Repeat Yourself) principles when designing and writing code.
8. Think of scalability before doing tasks
9. UI text should be in Russian
10. Don't write semicolons in .js files
