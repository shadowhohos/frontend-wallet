# NovaPay Frontend (demo only)

## Files
- `index.html` — marketing landing page
- `auth.html` — login and create-account UI
- `app.html` — wallet dashboard
- `css/styles.css` — shared responsive styling
- `js/auth.js` — demo-only account creation/login
- `js/app.js` — dashboard demo data and simulated transfers

## Run locally
Open `index.html` in a browser, or use VS Code's Live Server extension. For multi-page navigation, a local server is recommended.

## Demo behavior
- Create Account saves demo users in the browser's `localStorage`.
- Login checks those local demo entries.
- Dashboard uses sample funds and simulated transfers.
- Export Activity downloads a CSV file.
- No backend, Google Sheets, or real payment processing is connected.

## Important security limitations
This is a frontend prototype only. Passwords are stored in browser `localStorage` for demo functionality and are **not secure**. Never use real passwords or sensitive personal information. Before any real use, remove local demo authentication and connect to a secure backend with server-side password hashing, authorization, secure sessions, validation, rate limiting, and an audited financial ledger. Google Sheets should not be used as the source of truth for real money or financial transfers.

## Deploy to Vercel
Put these files in the root of your existing Git repository (keeping your current repository backup first), commit, and push. Static HTML works on Vercel without a build command.
