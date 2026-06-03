export default () => ({
  port: parseInt(process.env.APP_PORT, 10) || 3000,
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'voxo-jwt-secret-key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'voxo-refresh-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },
  apple: {
    clientId: process.env.APPLE_CLIENT_ID,
    teamId: process.env.APPLE_TEAM_ID,
    keyId: process.env.APPLE_KEY_ID,
    privateKey: process.env.APPLE_PRIVATE_KEY,
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    bucket: process.env.S3_BUCKET || 'voxo',
    accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.S3_SECRET_KEY || 'minioadmin',
    region: process.env.S3_REGION || 'us-east-1',
  },
  zegocloud: {
    appId: parseInt(process.env.ZEGOCLOUD_APP_ID, 10),
    serverSecret: process.env.ZEGOCLOUD_SERVER_SECRET,
  },
  click: {
    merchantId: process.env.CLICK_MERCHANT_ID,
    secretKey: process.env.CLICK_SECRET_KEY,
    serviceId: process.env.CLICK_SERVICE_ID,
    merchantUserId: process.env.CLICK_MERCHANT_USER_ID,
  },
  payme: {
    merchantId: process.env.PAYME_MERCHANT_ID,
    key: process.env.PAYME_KEY,
    testKey: process.env.PAYME_TEST_KEY,
    endpoint: process.env.PAYME_ENDPOINT || 'https://checkout.paycom.uz/api',
  },
  uzum: {
    merchantId: process.env.UZUM_MERCHANT_ID,
    secretKey: process.env.UZUM_SECRET_KEY,
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  },
  app: {
    name: 'VOXO',
    version: '1.0.0',
    port: parseInt(process.env.APP_PORT || process.env.PORT, 10) || 3000,
    baseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL, 10) || 60000,
    limit: parseInt(process.env.THROTTLE_LIMIT, 10) || 100,
  },
  upload: {
    maxSizeMb: parseInt(process.env.UPLOAD_MAX_SIZE_MB, 10) || 5,
  },
});
