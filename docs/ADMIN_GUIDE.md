# VOXO Admin Panel Guide

The VOXO Admin Panel is a Next.js application available at `https://admin.voxo.uz`.

---

## Login

1. Navigate to `https://admin.voxo.uz`
2. Enter your admin email and password
3. The session is managed by NextAuth with a JWT cookie (30-day expiry)

If you have not created an admin user yet, run:
```bash
cd /opt/voxo
ADMIN_EMAIL=admin@voxo.uz \
ADMIN_PASSWORD=YourSecurePassword \
DATABASE_URL=$(grep DATABASE_URL .env | cut -d= -f2-) \
bash scripts/init-admin.sh
```

---

## Sections

### Dashboard

Provides an overview of platform metrics:
- Active users (daily / monthly)
- Total registered users
- Active voice rooms
- Revenue summary (Click, Payme, Uzum)
- Recent signups and purchase activity

### Users

Manage all platform users:
- Search by email, phone, or display name
- View user profile: avatar, UID, registration date, subscription status
- Edit role (see RBAC section below)
- Suspend or permanently ban accounts
- Reset user password (sends email)
- View user's rooms, subscriptions, and transaction history

### Rooms

Manage voice chat rooms:
- List all public and private rooms
- View room members and current participants
- Force-close an active room
- View room creation date and owner
- Filter by status: active, closed, reported

### Subscriptions

Manage subscription plans:
- Create, edit, and delete subscription tiers
- Set price per tier per payment provider (Click, Payme, Uzum, Google Play)
- Enable/disable a plan globally
- View subscriber counts per plan

### Transactions

Financial transaction log:
- Filter by provider, status (pending, completed, failed, refunded), date range
- View transaction details: user, amount, currency, provider reference
- Manually mark a transaction as refunded (triggers webhook if configured)

### Reports

User-submitted content reports:
- View pending reports with context (reported user, reason, evidence)
- Take action: warn, suspend (1 day / 7 days / permanent), dismiss
- Bulk resolve

### Settings

Platform-wide configuration:
- App name, default language
- Feature flags (enable/disable voice rooms, subscriptions, social auth)
- Maintenance mode toggle

---

## RBAC Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `USER` | Regular app user | No admin access |
| `MODERATOR` | Content moderation | View users, manage reports, suspend (up to 7 days) |
| `ADMIN` | Full admin access | All above + manage subscriptions, transactions, settings |
| `SUPER_ADMIN` | Owner-level | All above + manage admin roles, delete data |

### Assign a Role

Via admin panel: Users → search user → Edit → Role dropdown → Save.

Via CLI:
```bash
docker compose -f docker-compose.prod.yml exec voxo-backend \
  npx ts-node -e "
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    prisma.user.update({
      where: { email: 'user@example.com' },
      data: { role: 'ADMIN' }
    }).then(u => { console.log('Updated:', u.email, u.role); prisma.\$disconnect(); });
  "
```

---

## Security Notes

- Admin panel is served on a separate subdomain (`admin.voxo.uz`) behind nginx with strict `X-Frame-Options: DENY`
- All admin actions are logged in the audit log table
- Session tokens expire after 30 days; forced logout clears the cookie
- Admin panel is not accessible from the mobile app; only from browsers with valid credentials
- SUPER_ADMIN role cannot be assigned via the UI — only via CLI or direct DB update

---

## Troubleshooting Login Issues

**"Invalid credentials" on correct password:**
```bash
# Check if admin user exists in DB
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U voxo -c "SELECT id, email, role FROM users WHERE email = 'admin@voxo.uz';"
```

**Session not persisting:**
Verify `NEXTAUTH_SECRET` in `admin/.env` matches the value in `.env`. They must be identical.

**Admin panel shows blank page:**
```bash
docker compose -f docker-compose.prod.yml logs voxo-admin --tail=30
```
