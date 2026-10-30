# NovaPay Frontend Rebuilt

## Local run
1. Start the FastAPI backend from its backend folder, e.g. `uvicorn main:app --reload --host 127.0.0.1 --port 8000`.
2. Open this folder in VS Code and start Live Server, normally at `http://127.0.0.1:5500`.
3. `js/config.js` defaults to `http://127.0.0.1:8000/api`.
4. Register with username, email, and a password of at least 12 characters, then sign in.

## API routes used
- `POST /api/register`
- `POST /api/login` (username or email requires the backend login function to accept both)
- `GET /api/wallet`
- `GET /api/transactions`

Set `FRONTEND_ORIGINS` in backend `.env` to the exact local frontend origin and restart FastAPI.

## Important limits
Current backend has no transfer or profile-edit endpoint, so this frontend does not fake transfers or profile changes. It is a prototype, not a real-money wallet. For Vercel deployment, replace the local API URL with the public HTTPS URL of your deployed backend ending in `/api`; never use 127.0.0.1 on a remote site.
