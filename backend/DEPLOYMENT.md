# Pha-Stock Backend Deployment

## Prerequisites
- Node.js 18+ runtime
- MongoDB Atlas cluster
- Repository connected to deployment platform

## Required Environment Variables
- `NODE_ENV=production`
- `PORT` (platform usually injects this automatically)
- `MONGO_URI` (Atlas connection string)
- `JWT_SECRET` (strong random secret)
- `JWT_EXPIRES_IN` (example: `7d`)
- `CORS_ORIGIN` (comma-separated allowed origins, example: `https://your-frontend.vercel.app,https://admin.yourapp.com`)

## Start Command
- `node src/server.js`

## Render Deployment
1. Create a new **Web Service** on Render from your repo.
2. Set runtime to **Node**.
3. Set build command: `npm install`.
4. Set start command: `npm run start`.
5. Add all required environment variables in Render dashboard.
6. Deploy and wait for build to complete.

## Railway Deployment
1. Create a new project in Railway and connect your repo.
2. Ensure service is detected as Node.js.
3. Set start command to `npm run start` if needed.
4. Add required environment variables in Railway Variables tab.
5. Trigger deployment and wait for healthy status.

## MongoDB Atlas Network Access
1. Open MongoDB Atlas -> **Network Access**.
2. Add IP access:
- For quick test: allow `0.0.0.0/0` (not recommended long term).
- Preferred: allow only platform egress IPs.
3. Open Atlas -> **Database Access** and ensure app user credentials are correct.
4. Confirm `MONGO_URI` uses the correct username/password and database.

## Post-Deploy Verification
1. Check health endpoint:
- `GET https://<your-domain>/health`
- `GET https://<your-domain>/api/v1/health`
2. Test auth login endpoint:
- `POST https://<your-domain>/api/v1/auth/login`
3. Call one protected endpoint with Bearer token (example `/api/v1/settings`).

## Common Errors

### ECONNREFUSED / Mongo connection failed
- Wrong `MONGO_URI`
- Atlas network access not allowed
- Atlas user credentials invalid

### CORS blocked in browser
- `CORS_ORIGIN` missing frontend domain
- Wrong protocol/domain/port in `CORS_ORIGIN`
- Multiple origins must be comma-separated with no trailing spaces

### Invalid JWT / auth failures
- Missing or weak `JWT_SECRET`
- `JWT_SECRET` changed between token issue and verification
- Expired tokens due to short `JWT_EXPIRES_IN`
