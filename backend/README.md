# Listify Backend

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file (see `.env.example`).
3. Start the backend in dev mode:
   ```bash
   npm run dev
   ```

## Endpoints
- `POST /api/gemini/routine-image` — Analyze routine image (requires `base64Image`, `mimeType`, `refreshToken`)

## Deployment
- Deploy the `backend/` folder to Vercel as a Node.js/Express app.
