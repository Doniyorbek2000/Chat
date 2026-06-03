import {
  PrismaClient,
  UserRole,
  GiftCategory,
  GiftType,
  Currency,
  VehicleLevel,
  FrameType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ==================== ADMIN USER ====================
  const adminPasswordHash = await bcrypt.hash(
    process.env.ADMIN_PASSWORD || 'Admin@123456',
    12,
  );

  const admin = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@voxo.app' },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || 'admin@voxo.app',
      username: 'admin',
      displayName: 'VOXO Admin',
      uid: 'admin-uid-001',
      role: UserRole.SUPER_ADMIN,
      isVerified: true,
      language: 'en',
      wallet: {
        create: {
          coins: BigInt(1000000),
          diamonds: BigInt(100000),
        },
      },
    },
  });
  console.log(`✅ Admin user created: ${admin.email}`);

  // ==================== GIFTS ====================
  const gifts = [
    {
      name: 'Rose',
      category: GiftCategory.NORMAL,
      type: GiftType.STATIC,
      imageUrl: 'https://cdn.voxo.app/gifts/rose.png',
      animationUrl: null,
      coinPrice: 1,
      diamondPrice: 0,
      sortOrder: 1,
      description: 'A beautiful red rose',
    },
    {
      name: 'Heart',
      category: GiftCategory.NORMAL,
      type: GiftType.LOTTIE,
      imageUrl: 'https://cdn.voxo.app/gifts/heart.png',
      animationUrl: 'https://cdn.voxo.app/gifts/heart.json',
      coinPrice: 10,
      diamondPrice: 0,
      sortOrder: 2,
      description: 'Send your love',
    },
    {
      name: 'Crown',
      category: GiftCategory.LUXURY,
      type: GiftType.SVGA,
      imageUrl: 'https://cdn.voxo.app/gifts/crown.png',
      animationUrl: 'https://cdn.voxo.app/gifts/crown.svga',
      coinPrice: 199,
      diamondPrice: 0,
      sortOrder: 10,
      description: 'Crown of royalty',
    },
    {
      name: 'Sports Car',
      category: GiftCategory.LUXURY,
      type: GiftType.SVGA,
      imageUrl: 'https://cdn.voxo.app/gifts/sports-car.png',
      animationUrl: 'https://cdn.voxo.app/gifts/sports-car.svga',
      coinPrice: 999,
      diamondPrice: 0,
      sortOrder: 20,
      description: 'A luxurious sports car',
    },
    {
      name: 'Helicopter',
      category: GiftCategory.LUXURY,
      type: GiftType.FULLSCREEN,
      imageUrl: 'https://cdn.voxo.app/gifts/helicopter.png',
      animationUrl: 'https://cdn.voxo.app/gifts/helicopter.svga',
      coinPrice: 4999,
      diamondPrice: 0,
      sortOrder: 30,
      description: 'Arrive in style',
    },
    {
      name: 'Private Jet',
      category: GiftCategory.LUXURY,
      type: GiftType.FULLSCREEN,
      imageUrl: 'https://cdn.voxo.app/gifts/private-jet.png',
      animationUrl: 'https://cdn.voxo.app/gifts/private-jet.svga',
      coinPrice: 9999,
      diamondPrice: 0,
      sortOrder: 40,
      description: 'Travel in ultimate luxury',
    },
    {
      name: 'Castle',
      category: GiftCategory.LUXURY,
      type: GiftType.FULLSCREEN,
      imageUrl: 'https://cdn.voxo.app/gifts/castle.png',
      animationUrl: 'https://cdn.voxo.app/gifts/castle.svga',
      coinPrice: 19999,
      diamondPrice: 0,
      sortOrder: 50,
      description: 'A magnificent castle',
    },
    {
      name: 'Dragon',
      category: GiftCategory.VIP,
      type: GiftType.FULLSCREEN,
      imageUrl: 'https://cdn.voxo.app/gifts/dragon.png',
      animationUrl: 'https://cdn.voxo.app/gifts/dragon.svga',
      coinPrice: 49999,
      diamondPrice: 0,
      sortOrder: 60,
      description: 'Unleash the dragon',
    },
    {
      name: 'Galaxy',
      category: GiftCategory.VIP,
      type: GiftType.FULLSCREEN,
      imageUrl: 'https://cdn.voxo.app/gifts/galaxy.png',
      animationUrl: 'https://cdn.voxo.app/gifts/galaxy.svga',
      coinPrice: 99999,
      diamondPrice: 0,
      sortOrder: 70,
      description: 'Gift the entire galaxy',
    },
    {
      name: 'Ice Cream',
      category: GiftCategory.NORMAL,
      type: GiftType.STATIC,
      imageUrl: 'https://cdn.voxo.app/gifts/ice-cream.png',
      animationUrl: null,
      coinPrice: 5,
      diamondPrice: 0,
      sortOrder: 3,
      description: 'Sweet ice cream treat',
    },
    {
      name: 'Ring',
      category: GiftCategory.COUPLE,
      type: GiftType.LOTTIE,
      imageUrl: 'https://cdn.voxo.app/gifts/ring.png',
      animationUrl: 'https://cdn.voxo.app/gifts/ring.json',
      coinPrice: 2999,
      diamondPrice: 0,
      sortOrder: 15,
      description: 'An eternal promise',
    },
    {
      name: 'Lucky Wheel',
      category: GiftCategory.LUCKY,
      type: GiftType.SVGA,
      imageUrl: 'https://cdn.voxo.app/gifts/lucky-wheel.png',
      animationUrl: 'https://cdn.voxo.app/gifts/lucky-wheel.svga',
      coinPrice: 88,
      diamondPrice: 0,
      sortOrder: 5,
      description: 'Spin for luck',
    },
  ];

  for (const gift of gifts) {
    await prisma.gift.upsert({
      where: { id: `gift-${gift.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: { coinPrice: gift.coinPrice, isActive: true },
      create: {
        id: `gift-${gift.name.toLowerCase().replace(/\s+/g, '-')}`,
        ...gift,
      },
    });
  }
  console.log(`✅ ${gifts.length} gifts seeded`);

  // ==================== VIP PLANS ====================
  const vipPlans = [
    {
      level: 1,
      name: 'VIP 1',
      price: 100,
      currency: Currency.COINS,
      duration: 30,
      features: {
        entryEffect: false,
        chatBubble: false,
        avatarFrame: true,
        badge: true,
        exclusiveEmojis: false,
        giftMultiplier: 1.0,
      },
    },
    {
      level: 2,
      name: 'VIP 2',
      price: 500,
      currency: Currency.COINS,
      duration: 30,
      features: {
        entryEffect: false,
        chatBubble: false,
        avatarFrame: true,
        badge: true,
        exclusiveEmojis: true,
        giftMultiplier: 1.05,
      },
    },
    {
      level: 3,
      name: 'VIP 3',
      price: 1000,
      currency: Currency.COINS,
      duration: 30,
      features: {
        entryEffect: false,
        chatBubble: true,
        avatarFrame: true,
        badge: true,
        exclusiveEmojis: true,
        giftMultiplier: 1.1,
      },
    },
    {
      level: 4,
      name: 'VIP 4',
      price: 5000,
      currency: Currency.COINS,
      duration: 30,
      features: {
        entryEffect: true,
        chatBubble: true,
        avatarFrame: true,
        badge: true,
        exclusiveEmojis: true,
        giftMultiplier: 1.15,
        prioritySupport: false,
      },
    },
    {
      level: 5,
      name: 'VIP 5',
      price: 10000,
      currency: Currency.COINS,
      duration: 30,
      features: {
        entryEffect: true,
        chatBubble: true,
        avatarFrame: true,
        badge: true,
        exclusiveEmojis: true,
        giftMultiplier: 1.2,
        prioritySupport: true,
      },
    },
    {
      level: 6,
      name: 'VIP 6',
      price: 30000,
      currency: Currency.COINS,
      duration: 30,
      features: {
        entryEffect: true,
        chatBubble: true,
        avatarFrame: true,
        badge: true,
        exclusiveEmojis: true,
        giftMultiplier: 1.25,
        prioritySupport: true,
        personalizedService: false,
      },
    },
    {
      level: 7,
      name: 'VIP 7',
      price: 50000,
      currency: Currency.COINS,
      duration: 30,
      features: {
        entryEffect: true,
        chatBubble: true,
        avatarFrame: true,
        badge: true,
        exclusiveEmojis: true,
        giftMultiplier: 1.3,
        prioritySupport: true,
        personalizedService: true,
      },
    },
    {
      level: 8,
      name: 'VIP 8',
      price: 100000,
      currency: Currency.COINS,
      duration: 30,
      features: {
        entryEffect: true,
        chatBubble: true,
        avatarFrame: true,
        badge: true,
        exclusiveEmojis: true,
        giftMultiplier: 1.35,
        prioritySupport: true,
        personalizedService: true,
        exclusiveRooms: true,
      },
    },
    {
      level: 9,
      name: 'VIP 9',
      price: 200000,
      currency: Currency.COINS,
      duration: 30,
      features: {
        entryEffect: true,
        chatBubble: true,
        avatarFrame: true,
        badge: true,
        exclusiveEmojis: true,
        giftMultiplier: 1.4,
        prioritySupport: true,
        personalizedService: true,
        exclusiveRooms: true,
        managerSupport: false,
      },
    },
    {
      level: 10,
      name: 'VIP 10',
      price: 500000,
      currency: Currency.COINS,
      duration: 30,
      features: {
        entryEffect: true,
        chatBubble: true,
        avatarFrame: true,
        badge: true,
        exclusiveEmojis: true,
        giftMultiplier: 1.5,
        prioritySupport: true,
        personalizedService: true,
        exclusiveRooms: true,
        managerSupport: true,
        diamondConversion: 1.1,
      },
    },
  ];

  for (const plan of vipPlans) {
    await prisma.vipPlan.upsert({
      where: { level: plan.level },
      update: { price: plan.price, features: plan.features },
      create: plan,
    });
  }
  console.log(`✅ ${vipPlans.length} VIP plans seeded`);

  // ==================== COIN RECHARGE PACKAGES ====================
  // These are stored as banners/events or custom model - adding as metadata in admin config
  const coinPackages = [
    { coins: 100, priceUSD: 0.99, priceUZS: 12000, bonus: 0 },
    { coins: 500, priceUSD: 4.99, priceUZS: 60000, bonus: 50 },
    { coins: 1000, priceUSD: 9.99, priceUZS: 120000, bonus: 150 },
    { coins: 5000, priceUSD: 49.99, priceUZS: 600000, bonus: 1000 },
    { coins: 10000, priceUSD: 99.99, priceUZS: 1200000, bonus: 3000 },
  ];
  console.log(
    `✅ ${coinPackages.length} coin packages defined (store in app config)`,
  );

  // ==================== ACHIEVEMENTS ====================
  const achievements = [
    {
      name: 'first_gift',
      description: 'Send your first gift',
      icon: 'https://cdn.voxo.app/achievements/first-gift.png',
      type: 'GIFT_SEND',
      requirement: 1,
      rewardCoins: 50,
      rewardDiamonds: 0,
    },
    {
      name: 'gift_master_10',
      description: 'Send 10 gifts',
      icon: 'https://cdn.voxo.app/achievements/gift-10.png',
      type: 'GIFT_SEND',
      requirement: 10,
      rewardCoins: 200,
      rewardDiamonds: 0,
    },
    {
      name: 'gift_master_100',
      description: 'Send 100 gifts',
      icon: 'https://cdn.voxo.app/achievements/gift-100.png',
      type: 'GIFT_SEND',
      requirement: 100,
      rewardCoins: 2000,
      rewardDiamonds: 10,
    },
    {
      name: 'social_butterfly',
      description: 'Follow 10 users',
      icon: 'https://cdn.voxo.app/achievements/follow-10.png',
      type: 'FOLLOW',
      requirement: 10,
      rewardCoins: 100,
      rewardDiamonds: 0,
    },
    {
      name: 'popular_creator',
      description: 'Get 100 followers',
      icon: 'https://cdn.voxo.app/achievements/followers-100.png',
      type: 'FOLLOWERS',
      requirement: 100,
      rewardCoins: 500,
      rewardDiamonds: 5,
    },
    {
      name: 'room_host_10',
      description: 'Host 10 voice rooms',
      icon: 'https://cdn.voxo.app/achievements/host-10.png',
      type: 'ROOM_HOST',
      requirement: 10,
      rewardCoins: 300,
      rewardDiamonds: 0,
    },
    {
      name: 'room_veteran',
      description: 'Spend 100 hours in voice rooms',
      icon: 'https://cdn.voxo.app/achievements/room-veteran.png',
      type: 'ROOM_TIME',
      requirement: 6000,
      rewardCoins: 1000,
      rewardDiamonds: 20,
    },
    {
      name: 'big_spender_1k',
      description: 'Spend 1,000 coins on gifts',
      icon: 'https://cdn.voxo.app/achievements/spend-1k.png',
      type: 'COINS_SPENT',
      requirement: 1000,
      rewardCoins: 100,
      rewardDiamonds: 5,
    },
    {
      name: 'big_spender_100k',
      description: 'Spend 100,000 coins on gifts',
      icon: 'https://cdn.voxo.app/achievements/spend-100k.png',
      type: 'COINS_SPENT',
      requirement: 100000,
      rewardCoins: 5000,
      rewardDiamonds: 50,
    },
    {
      name: 'daily_login_7',
      description: 'Log in 7 days in a row',
      icon: 'https://cdn.voxo.app/achievements/daily-7.png',
      type: 'DAILY_LOGIN',
      requirement: 7,
      rewardCoins: 150,
      rewardDiamonds: 0,
    },
    {
      name: 'daily_login_30',
      description: 'Log in 30 days in a row',
      icon: 'https://cdn.voxo.app/achievements/daily-30.png',
      type: 'DAILY_LOGIN',
      requirement: 30,
      rewardCoins: 1000,
      rewardDiamonds: 15,
    },
    {
      name: 'family_founder',
      description: 'Create a family',
      icon: 'https://cdn.voxo.app/achievements/family-founder.png',
      type: 'FAMILY_CREATE',
      requirement: 1,
      rewardCoins: 500,
      rewardDiamonds: 5,
    },
  ];

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { name: achievement.name },
      update: {},
      create: achievement,
    });
  }
  console.log(`✅ ${achievements.length} achievements seeded`);

  // ==================== VEHICLES ====================
  const vehicles = [
    {
      name: 'Skateboard',
      level: VehicleLevel.BRONZE,
      animationUrl: 'https://cdn.voxo.app/vehicles/skateboard.svga',
      previewUrl: 'https://cdn.voxo.app/vehicles/skateboard-preview.png',
      coinPrice: 500,
      duration: 30,
    },
    {
      name: 'Bicycle',
      level: VehicleLevel.BRONZE,
      animationUrl: 'https://cdn.voxo.app/vehicles/bicycle.svga',
      previewUrl: 'https://cdn.voxo.app/vehicles/bicycle-preview.png',
      coinPrice: 1000,
      duration: 30,
    },
    {
      name: 'Motorcycle',
      level: VehicleLevel.SILVER,
      animationUrl: 'https://cdn.voxo.app/vehicles/motorcycle.svga',
      previewUrl: 'https://cdn.voxo.app/vehicles/motorcycle-preview.png',
      coinPrice: 3000,
      duration: 30,
    },
    {
      name: 'Sports Car',
      level: VehicleLevel.GOLD,
      animationUrl: 'https://cdn.voxo.app/vehicles/sports-car.svga',
      previewUrl: 'https://cdn.voxo.app/vehicles/sports-car-preview.png',
      coinPrice: 8000,
      duration: 30,
    },
    {
      name: 'Lamborghini',
      level: VehicleLevel.PLATINUM,
      animationUrl: 'https://cdn.voxo.app/vehicles/lamborghini.svga',
      previewUrl: 'https://cdn.voxo.app/vehicles/lamborghini-preview.png',
      coinPrice: 20000,
      duration: 30,
    },
    {
      name: 'Private Jet',
      level: VehicleLevel.DIAMOND,
      animationUrl: 'https://cdn.voxo.app/vehicles/private-jet.svga',
      previewUrl: 'https://cdn.voxo.app/vehicles/private-jet-preview.png',
      coinPrice: 50000,
      duration: 30,
    },
    {
      name: 'Space Rocket',
      level: VehicleLevel.LEGENDARY,
      animationUrl: 'https://cdn.voxo.app/vehicles/space-rocket.svga',
      previewUrl: 'https://cdn.voxo.app/vehicles/space-rocket-preview.png',
      coinPrice: 100000,
      duration: 30,
    },
  ];

  for (const vehicle of vehicles) {
    await prisma.vehicle.upsert({
      where: {
        id: `vehicle-${vehicle.name.toLowerCase().replace(/\s+/g, '-')}`,
      },
      update: { coinPrice: vehicle.coinPrice },
      create: {
        id: `vehicle-${vehicle.name.toLowerCase().replace(/\s+/g, '-')}`,
        ...vehicle,
      },
    });
  }
  console.log(`✅ ${vehicles.length} vehicles seeded`);

  // ==================== FRAMES ====================
  const frames = [
    {
      name: 'Golden Frame',
      type: FrameType.AVATAR,
      imageUrl: 'https://cdn.voxo.app/frames/golden-avatar.png',
      level: 1,
      coinPrice: 2000,
      duration: 30,
    },
    {
      name: 'Diamond Frame',
      type: FrameType.AVATAR,
      imageUrl: 'https://cdn.voxo.app/frames/diamond-avatar.png',
      level: 5,
      coinPrice: 10000,
      duration: 30,
    },
    {
      name: 'Galaxy Frame',
      type: FrameType.AVATAR,
      imageUrl: 'https://cdn.voxo.app/frames/galaxy-avatar.png',
      level: 8,
      coinPrice: 30000,
      duration: 30,
    },
    {
      name: 'Flame Mic',
      type: FrameType.MIC,
      imageUrl: 'https://cdn.voxo.app/frames/flame-mic.png',
      level: 1,
      coinPrice: 1500,
      duration: 30,
    },
    {
      name: 'Crown Mic',
      type: FrameType.MIC,
      imageUrl: 'https://cdn.voxo.app/frames/crown-mic.png',
      level: 5,
      coinPrice: 8000,
      duration: 30,
    },
    {
      name: 'Neon Chat',
      type: FrameType.CHAT_BUBBLE,
      imageUrl: 'https://cdn.voxo.app/frames/neon-chat.png',
      level: 1,
      coinPrice: 1000,
      duration: 30,
    },
  ];

  for (const frame of frames) {
    await prisma.frame.upsert({
      where: { id: `frame-${frame.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: { coinPrice: frame.coinPrice },
      create: {
        id: `frame-${frame.name.toLowerCase().replace(/\s+/g, '-')}`,
        ...frame,
      },
    });
  }
  console.log(`✅ ${frames.length} frames seeded`);

  console.log('\n🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
