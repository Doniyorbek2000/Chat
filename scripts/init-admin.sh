#!/bin/bash
# Create initial super admin user
# Usage: ./scripts/init-admin.sh
set -e

: "${ADMIN_EMAIL:?ADMIN_EMAIL is required}"
: "${ADMIN_PASSWORD:?ADMIN_PASSWORD is required}"
: "${DATABASE_URL:?DATABASE_URL is required}"

echo "Creating admin user: $ADMIN_EMAIL"
cd /home/user/Chat/backend
npx ts-node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
  const uid = 'ADMIN' + Date.now();
  const user = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL },
    update: { role: 'SUPER_ADMIN' },
    create: {
      email: process.env.ADMIN_EMAIL,
      uid,
      displayName: 'Super Admin',
      role: 'SUPER_ADMIN',
    },
  });
  console.log('Admin created:', user.id, user.email);
  await prisma.\$disconnect();
}
main().catch(console.error);
"
