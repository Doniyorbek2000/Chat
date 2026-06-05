# VOXO Environment Variables Reference

Copy `.env.production.example` to `.env` and fill in all `CHANGE_ME` values before starting the stack.

---

## Core Application

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Runtime environment | `production` |
| `PORT` | Yes | Backend HTTP port | `3000` |
| `APP_URL` | Yes | Public API base URL | `https://api.voxo.uz` |
| `ADMIN_URL` | Yes | Admin panel base URL | `https://admin.voxo.uz` |
| `CORS_ORIGINS` | Yes | Comma-separated allowed origins | `https://admin.voxo.uz,voxo://app` |

---

## Database

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://voxo:pass@postgres:5432/voxo` |

Generate a strong password: `openssl rand -base64 24`

---

## Redis

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `REDIS_URL` | Yes | Redis connection with password | `redis://:password@redis:6379` |

---

## JWT / Auth

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `JWT_SECRET` | Yes | Access token signing secret (min 32 chars) | `openssl rand -hex 64` |
| `JWT_REFRESH_SECRET` | Yes | Refresh token signing secret | `openssl rand -hex 64` |
| `JWT_EXPIRES_IN` | Yes | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Yes | Refresh token TTL | `30d` |

---

## OAuth Providers

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID | `123.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret | `GOCSPX-...` |
| `APPLE_CLIENT_ID` | No | Apple Sign-In service ID | `uz.voxo.signin` |
| `APPLE_TEAM_ID` | No | Apple Developer team ID | `ABCDEF1234` |
| `APPLE_KEY_ID` | No | Apple private key ID | `ABCDE12345` |
| `APPLE_PRIVATE_KEY` | No | Apple private key (PEM content) | `-----BEGIN PRIVATE KEY-----\n...` |

---

## Payment Providers

| Variable | Required | Description |
|----------|----------|-------------|
| `CLICK_MERCHANT_ID` | No | Click payment merchant ID |
| `CLICK_SERVICE_ID` | No | Click service ID |
| `CLICK_SECRET_KEY` | No | Click HMAC secret |
| `PAYME_MERCHANT_ID` | No | Payme merchant ID |
| `PAYME_SECRET_KEY` | No | Payme API key |
| `UZUM_MERCHANT_ID` | No | Uzum Bank merchant ID |
| `UZUM_SECRET_KEY` | No | Uzum Bank API secret |
| `GOOGLE_PLAY_PACKAGE_NAME` | No | Android app package name | `com.voxo.app` |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | No | Google Play service account JSON (inline) |
| `GOOGLE_PLAY_MOCK_VERIFY` | No | Skip real Play Store receipt verification | `false` |

---

## Storage (MinIO / S3)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `S3_ENDPOINT` | Yes | S3-compatible storage endpoint | `http://minio:9000` |
| `S3_REGION` | Yes | Bucket region | `us-east-1` |
| `S3_ACCESS_KEY` | Yes | Access key ID | `minio-access-key` |
| `S3_SECRET_KEY` | Yes | Secret access key | `minio-secret-key` |
| `S3_BUCKET` | Yes | Bucket name | `voxo` |
| `S3_PUBLIC_URL` | Yes | Public CDN URL for assets | `https://cdn.voxo.uz` |

---

## Push Notifications (Firebase)

| Variable | Required | Description |
|----------|----------|-------------|
| `FIREBASE_PROJECT_ID` | No | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | No | Service account email |
| `FIREBASE_PRIVATE_KEY` | No | Service account private key (PEM) |

---

## Voice (ZegoCloud)

| Variable | Required | Description |
|----------|----------|-------------|
| `ZEGO_APP_ID` | No | ZegoCloud App ID (numeric) |
| `ZEGO_SERVER_SECRET` | No | ZegoCloud server secret |
| `ZEGOCLOUD_APP_ID` | No | Alias for ZEGO_APP_ID |
| `ZEGOCLOUD_SERVER_SECRET` | No | Alias for ZEGO_SERVER_SECRET |

---

## Docker Compose Overrides

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `POSTGRES_PASSWORD` | Yes | PostgreSQL root password | `openssl rand -base64 24` |
| `REDIS_PASSWORD` | Yes | Redis AUTH password | `openssl rand -base64 24` |
| `MINIO_ROOT_USER` | Yes | MinIO root username | `voxo-minio` |
| `MINIO_ROOT_PASSWORD` | Yes | MinIO root password (min 8 chars) | `openssl rand -base64 12` |
| `NEXTAUTH_SECRET` | Yes | NextAuth signing secret | `openssl rand -hex 32` |
| `IMAGE_TAG` | Yes | Docker image tag to deploy | `latest` or `main-abc1234` |

---

## Admin Panel (`admin/.env`)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API base URL | `https://api.voxo.uz` |
| `NEXT_PUBLIC_APP_NAME` | Yes | App display name | `VOXO` |
| `NEXT_PUBLIC_ENVIRONMENT` | Yes | Environment label | `production` |
| `NEXTAUTH_URL` | Yes | Admin panel public URL | `https://admin.voxo.uz` |
| `NEXTAUTH_SECRET` | Yes | Must match backend NEXTAUTH_SECRET | — |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry error tracking DSN | — |

---

## Optional / Tuning

| Variable | Default | Description |
|----------|---------|-------------|
| `BCRYPT_ROUNDS` | `10` | Password hashing cost factor |
| `RATE_LIMIT_TTL` | `60000` | Rate limit window in ms |
| `RATE_LIMIT_LIMIT` | `100` | Max requests per window |
| `MAX_UPLOAD_SIZE_MB` | `10` | Maximum file upload size |
| `LOG_LEVEL` | `info` | Log verbosity: `error`, `warn`, `info`, `debug` |
| `SENTRY_DSN` | — | Backend Sentry DSN for error tracking |
| `ADMIN_EMAIL` | — | Initial super admin email (used by init-admin.sh) |
| `ADMIN_PASSWORD` | — | Initial super admin password |
