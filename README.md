# VOXO - Enterprise Voice Chat & Live Social Platform

VOXO is a feature-rich, real-time voice chat and social platform built for enterprise scale. It supports voice rooms, live gifting, VIP memberships, family/clan systems, PK battles, and integrated payment processing.

## Architecture Overview

```
                          ┌─────────────────────────────────┐
                          │           NGINX (Reverse Proxy)  │
                          │  api.voxo.app / admin.voxo.app   │
                          └──────────────┬──────────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                                          │
          ┌─────────▼──────────┐              ┌───────────────▼─────────┐
          │   NestJS Backend   │              │    Next.js Admin Panel   │
          │   (API + WebSocket)│              │    (Management UI)       │
          │   Port: 3000       │              │    Port: 3001            │
          └────────┬───────────┘              └─────────────────────────┘
                   │
       ┌───────────┼───────────┬───────────────┐
       │           │           │               │
  ┌────▼────┐ ┌────▼────┐ ┌────▼────┐  ┌──────▼──────┐
  │PostgreSQL│ │  Redis  │ │  MinIO  │  │  ZEGOCLOUD  │
  │(Primary  │ │(Cache + │ │(Object  │  │(Voice RTC)  │
  │Database) │ │ Queues) │ │Storage) │  └─────────────┘
  └─────────┘ └─────────┘ └─────────┘
                              │
                    ┌─────────┴──────────────┐
                    │      Mobile App         │
                    │  Flutter (iOS/Android)  │
                    └────────────────────────┘
```

## Tech Stack

| Layer         | Technology                                         |
|---------------|----------------------------------------------------|
| Backend API   | NestJS 10, TypeScript, Prisma ORM                  |
| Database      | PostgreSQL 16                                       |
| Cache/Queue   | Redis 7, Bull/BullMQ                               |
| Object Storage| MinIO (S3-compatible)                              |
| Mobile App    | Flutter 3, Riverpod, Go Router                    |
| Admin Panel   | Next.js 14, TypeScript, Tailwind CSS               |
| Voice RTC     | ZEGOCLOUD SDK                                      |
| Push Notifications | Firebase Cloud Messaging (FCM)              |
| Reverse Proxy | NGINX                                              |
| Containerization | Docker, Docker Compose                          |
| CI/CD         | GitHub Actions                                     |
| Auth          | JWT, Google OAuth, Apple Sign In                   |
| Payments      | Click, Payme, Uzum Bank                            |

## Prerequisites

- **Docker** 24.0+ and **Docker Compose** 2.20+
- **Node.js** 20 LTS (for local development without Docker)
- **Flutter** 3.19+ and **Dart** 3.3+
- **Git** 2.40+

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/voxo-app/voxo.git
cd voxo
```

### 2. Set up environment variables

```bash
cp backend/.env.example backend/.env
cp admin/.env.example admin/.env
```

Edit the `.env` files and fill in your credentials.

### 3. Start all services

```bash
make dev
# or
docker compose up -d
```

### 4. Run database migrations and seed

```bash
make db-migrate
make db-seed
```

### 5. Access the platform

| Service       | URL                          |
|---------------|------------------------------|
| Backend API   | http://localhost:3000        |
| API Docs      | http://localhost:3000/api/docs |
| Admin Panel   | http://localhost:3001        |
| MinIO Console | http://localhost:9001        |
| PostgreSQL    | localhost:5432               |
| Redis         | localhost:6379               |

## Environment Setup

### Backend Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

```bash
# Required for basic functionality
DATABASE_URL=postgresql://voxo:voxo_secure_password@localhost:5432/voxo
REDIS_URL=redis://:redis_password@localhost:6379
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Required for voice rooms
ZEGOCLOUD_APP_ID=your-app-id
ZEGOCLOUD_SERVER_SECRET=your-server-secret

# Required for file uploads
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin

# Required for push notifications
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
```

### Admin Environment Variables

Copy `admin/.env.example` to `admin/.env`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-nextauth-secret
```

## Development Commands

```bash
# Start all services
make dev

# View all logs
make logs

# Run backend tests
make test

# Run database migrations
make db-migrate

# Seed the database
make db-seed

# Open Prisma Studio
make db-studio

# Open backend shell
make backend-shell

# Open PostgreSQL shell
make postgres-shell

# Stop all services
make stop

# Full cleanup (removes volumes)
make clean
```

Run `make help` to see all available commands.

## API Documentation

Interactive API documentation is available at http://localhost:3000/api/docs (Swagger UI) when running in development mode.

### Key API Endpoints

```
POST /api/v1/auth/register     - User registration
POST /api/v1/auth/login        - User login
POST /api/v1/auth/refresh      - Refresh access token
GET  /api/v1/rooms             - List voice rooms
POST /api/v1/rooms             - Create voice room
POST /api/v1/rooms/:id/join    - Join voice room
POST /api/v1/gifts/send        - Send a gift
GET  /api/v1/users/:id         - Get user profile
GET  /api/v1/leaderboard       - Get leaderboard
```

## Mobile App Setup

### Prerequisites

- Flutter SDK 3.19+
- Android Studio or Xcode
- Firebase project configured

### Getting started

```bash
cd mobile
flutter pub get
dart run build_runner build --delete-conflicting-outputs
flutter run
```

### Android

1. Place your `google-services.json` in `mobile/android/app/`
2. Configure signing in `mobile/android/key.properties`
3. Build: `flutter build apk --release`

### iOS

1. Place your `GoogleService-Info.plist` in `mobile/ios/Runner/`
2. Open `mobile/ios/Runner.xcworkspace` in Xcode
3. Configure signing and capabilities
4. Build: `flutter build ios --release`

## Admin Panel Setup

The admin panel is a Next.js application at `http://localhost:3001`.

Default credentials (change immediately after first login):
- Email: `admin@voxo.app`
- Password: `Admin@123456`

### Features
- User management and moderation
- Voice room monitoring
- Gift management and analytics
- Payment processing (Click, Payme, Uzum)
- Withdrawal approvals
- Event management
- Content moderation
- Analytics dashboard

## Deployment Guide

### Production Deployment

1. **Set up your server** (Ubuntu 22.04 recommended)

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Clone repository
git clone https://github.com/voxo-app/voxo.git /opt/voxo
cd /opt/voxo
```

2. **Configure environment**

```bash
cp backend/.env.example .env.prod
# Edit .env.prod with production values
```

3. **Set up SSL certificates**

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificates
sudo certbot certonly --standalone -d api.voxo.app -d admin.voxo.app
```

4. **Start production services**

```bash
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec voxo-backend npx prisma migrate deploy
```

### CI/CD

The project uses GitHub Actions for automated CI/CD:

- **Backend CI**: `.github/workflows/backend-ci.yml`
- **Admin CI**: `.github/workflows/admin-ci.yml`
- **Mobile CI**: `.github/workflows/mobile-ci.yml`

Required GitHub secrets:
```
STAGING_HOST, STAGING_USER, STAGING_SSH_KEY
PROD_HOST, PROD_USER, PROD_SSH_KEY
ANDROID_KEYSTORE_BASE64, ANDROID_STORE_PASSWORD
IOS_DISTRIBUTION_CERTIFICATE_BASE64
APPSTORE_CONNECT_ISSUER_ID, APPSTORE_CONNECT_API_KEY_ID, APPSTORE_CONNECT_API_PRIVATE_KEY
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
```

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: fix a bug
docs: update documentation
style: formatting changes
refactor: code refactoring
test: add or update tests
chore: maintenance tasks
```

### Code Style

- Backend: ESLint + Prettier (configured in `backend/.eslintrc.js`)
- Admin: ESLint + Next.js config
- Mobile: flutter_lints

## License

This project is proprietary software. All rights reserved. Unauthorized copying, distribution, or modification is strictly prohibited.

---

Built with love by the VOXO Team.
