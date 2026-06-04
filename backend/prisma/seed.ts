import { PrismaClient, UserRole, GiftCategory, GiftType, VehicleLevel, RoomType, EventType, LinkType, Currency, RechargeProductType, NobleTier, AssetGrade, MedalCategory, ShopCategory } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomCoins(min: number, max: number): bigint {
  return BigInt(Math.floor(Math.random() * (max - min + 1)) + min);
}

function generateUid(index: number): string {
  return `VOXO${String(index).padStart(6, '0')}`;
}

function generateUsername(base: string): string {
  return `${base}_${Math.floor(Math.random() * 9000) + 1000}`;
}

// ---------------------------------------------------------------------------
// Seed data definitions
// ---------------------------------------------------------------------------

const HASHED_PASSWORD_PLACEHOLDER = 'Password123!'; // Will be hashed at runtime

async function seedUsers(hashedPassword: string) {
  console.log('Seeding users...');

  // Admin user
  const admin = await prisma.user.upsert({
    where: { phone: '+998900000001' },
    update: {},
    create: {
      phone: '+998900000001',
      username: 'admin_voxo',
      displayName: 'VOXO Admin',
      uid: generateUid(1),
      role: UserRole.ADMIN,
      isVerified: true,
      isOnline: true,
      level: 99,
      referralCode: 'ADMIN001',
    },
  });

  // Moderator user
  const moderator = await prisma.user.upsert({
    where: { phone: '+998900000002' },
    update: {},
    create: {
      phone: '+998900000002',
      username: 'moderator_voxo',
      displayName: 'VOXO Moderator',
      uid: generateUid(2),
      role: UserRole.MODERATOR,
      isVerified: true,
      isOnline: true,
      level: 50,
      referralCode: 'MOD0002',
    },
  });

  // 10 regular test users
  const testUsers = [];
  for (let i = 1; i <= 10; i++) {
    const phone = `+99890123456${i}`;
    const user = await prisma.user.upsert({
      where: { phone },
      update: {},
      create: {
        phone,
        username: `testuser_${i}`,
        displayName: `Test User ${i}`,
        uid: generateUid(100 + i),
        role: UserRole.USER,
        isVerified: i % 3 === 0,
        isOnline: i % 2 === 0,
        level: Math.floor(Math.random() * 30) + 1,
        vipLevel: i <= 5 ? i - 1 : 0,
        isVip: i <= 5,
        referralCode: `TEST${String(i).padStart(4, '0')}`,
      },
    });
    testUsers.push(user);
  }

  console.log(`  Created admin: ${admin.uid}`);
  console.log(`  Created moderator: ${moderator.uid}`);
  console.log(`  Created ${testUsers.length} test users`);

  return { admin, moderator, testUsers };
}

async function seedWallets(admin: { id: string }, moderator: { id: string }, testUsers: { id: string }[]) {
  console.log('Seeding wallets...');

  // Admin wallet
  await prisma.wallet.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      coins: BigInt(999999),
      diamonds: BigInt(999999),
      totalRecharge: BigInt(999999),
      totalGifted: BigInt(0),
      totalEarned: BigInt(0),
      totalWithdrawn: BigInt(0),
    },
  });

  // Moderator wallet
  await prisma.wallet.upsert({
    where: { userId: moderator.id },
    update: {},
    create: {
      userId: moderator.id,
      coins: BigInt(50000),
      diamonds: BigInt(10000),
      totalRecharge: BigInt(50000),
      totalGifted: BigInt(0),
      totalEarned: BigInt(0),
      totalWithdrawn: BigInt(0),
    },
  });

  // Test user wallets with random coins
  for (const user of testUsers) {
    await prisma.wallet.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        coins: randomCoins(1000, 50000),
        diamonds: randomCoins(50, 5000),
        totalRecharge: randomCoins(500, 100000),
        totalGifted: BigInt(0),
        totalEarned: BigInt(0),
        totalWithdrawn: BigInt(0),
      },
    });
  }

  console.log('  Wallets seeded.');
}

async function seedVipPlans() {
  console.log('Seeding VIP plans...');

  const plans = [
    {
      level: 1,
      name: 'Bronze VIP',
      price: 299,
      currency: Currency.DIAMONDS,
      duration: 30,
      features: {
        perks: ['Bronze frame', 'VIP badge', 'Gift ×1.1'],
        giftMultiplier: 1.1,
        frameType: 'bronze',
      },
    },
    {
      level: 2,
      name: 'Silver VIP',
      price: 699,
      currency: Currency.DIAMONDS,
      duration: 30,
      features: {
        perks: ['Silver frame', 'VIP badge', 'Gift ×1.2', 'Priority support'],
        giftMultiplier: 1.2,
        frameType: 'silver',
      },
    },
    {
      level: 3,
      name: 'Gold VIP',
      price: 1499,
      currency: Currency.DIAMONDS,
      duration: 30,
      features: {
        perks: ['Gold frame', 'VIP badge', 'Gift ×1.5', 'Special entry effect', 'Custom chat bubble'],
        giftMultiplier: 1.5,
        frameType: 'gold',
      },
    },
    {
      level: 4,
      name: 'Platinum VIP',
      price: 2999,
      currency: Currency.DIAMONDS,
      duration: 30,
      features: {
        perks: ['Platinum frame', 'VIP badge', 'Gift ×2.0', 'Exclusive entry effect', 'Custom chat bubble', 'Room priority'],
        giftMultiplier: 2.0,
        frameType: 'platinum',
      },
    },
    {
      level: 5,
      name: 'Diamond VIP',
      price: 5999,
      currency: Currency.DIAMONDS,
      duration: 30,
      features: {
        perks: ['Diamond frame', 'VIP badge', 'Gift ×2.5', 'Exclusive entry effect', 'Custom chat bubble', 'Room priority', 'Personal assistant'],
        giftMultiplier: 2.5,
        frameType: 'diamond',
      },
    },
  ];

  for (const plan of plans) {
    await prisma.vipPlan.upsert({
      where: { level: plan.level },
      update: { name: plan.name, price: plan.price, features: plan.features },
      create: plan,
    });
  }

  console.log(`  Seeded ${plans.length} VIP plans.`);
}

async function seedGifts() {
  console.log('Seeding gifts...');

  const gifts = [
    // ===== NORMAL (cheap daily gifts) =====
    { name: 'Rose', category: GiftCategory.NORMAL, type: GiftType.STATIC, imageUrl: 'https://cdn.voxo.app/gifts/rose.png', coinPrice: 10, sortOrder: 1 },
    { name: 'Heart', category: GiftCategory.NORMAL, type: GiftType.LOTTIE, imageUrl: 'https://cdn.voxo.app/gifts/heart.png', coinPrice: 20, sortOrder: 2 },
    { name: 'Love Letter', category: GiftCategory.NORMAL, type: GiftType.STATIC, imageUrl: 'https://cdn.voxo.app/gifts/love-letter.png', coinPrice: 15, sortOrder: 3 },
    { name: 'Teddy Bear', category: GiftCategory.NORMAL, type: GiftType.LOTTIE, imageUrl: 'https://cdn.voxo.app/gifts/teddy-bear.png', coinPrice: 50, sortOrder: 4 },
    { name: 'Balloon', category: GiftCategory.NORMAL, type: GiftType.LOTTIE, imageUrl: 'https://cdn.voxo.app/gifts/balloon.png', coinPrice: 8, sortOrder: 5 },
    { name: 'Candy', category: GiftCategory.NORMAL, type: GiftType.STATIC, imageUrl: 'https://cdn.voxo.app/gifts/candy.png', coinPrice: 5, sortOrder: 6 },
    { name: 'Star', category: GiftCategory.NORMAL, type: GiftType.LOTTIE, imageUrl: 'https://cdn.voxo.app/gifts/star.png', coinPrice: 12, sortOrder: 7 },
    { name: 'Flower Bouquet', category: GiftCategory.NORMAL, type: GiftType.SVGA, imageUrl: 'https://cdn.voxo.app/gifts/bouquet.png', coinPrice: 30, sortOrder: 8 },
    { name: 'Thumbs Up', category: GiftCategory.NORMAL, type: GiftType.STATIC, imageUrl: 'https://cdn.voxo.app/gifts/thumbsup.png', coinPrice: 3, sortOrder: 9 },
    { name: 'Mic', category: GiftCategory.NORMAL, type: GiftType.STATIC, imageUrl: 'https://cdn.voxo.app/gifts/mic.png', coinPrice: 7, sortOrder: 10 },

    // ===== LUXURY (mid-tier) =====
    { name: 'Sports Car', category: GiftCategory.LUXURY, type: GiftType.SVGA, imageUrl: 'https://cdn.voxo.app/gifts/sports-car.png', coinPrice: 500, sortOrder: 20 },
    { name: 'Yacht', category: GiftCategory.LUXURY, type: GiftType.FULLSCREEN, imageUrl: 'https://cdn.voxo.app/gifts/yacht.png', coinPrice: 1000, sortOrder: 21 },
    { name: 'Private Jet', category: GiftCategory.LUXURY, type: GiftType.FULLSCREEN, imageUrl: 'https://cdn.voxo.app/gifts/private-jet.png', coinPrice: 2000, sortOrder: 22 },
    { name: 'Diamond Ring', category: GiftCategory.LUXURY, type: GiftType.FULLSCREEN, imageUrl: 'https://cdn.voxo.app/gifts/diamond-ring.png', coinPrice: 5000, sortOrder: 23 },
    { name: 'Champagne', category: GiftCategory.LUXURY, type: GiftType.SVGA, imageUrl: 'https://cdn.voxo.app/gifts/champagne.png', coinPrice: 80, sortOrder: 24 },
    { name: 'Gold Bar', category: GiftCategory.LUXURY, type: GiftType.LOTTIE, imageUrl: 'https://cdn.voxo.app/gifts/gold-bar.png', coinPrice: 300, sortOrder: 25 },
    { name: 'Castle', category: GiftCategory.LUXURY, type: GiftType.FULLSCREEN, imageUrl: 'https://cdn.voxo.app/gifts/castle.png', coinPrice: 3000, sortOrder: 26 },
    { name: 'Rolex', category: GiftCategory.LUXURY, type: GiftType.SVGA, imageUrl: 'https://cdn.voxo.app/gifts/rolex.png', coinPrice: 800, sortOrder: 27 },

    // ===== VIP =====
    { name: 'Galaxy', category: GiftCategory.VIP, type: GiftType.FULLSCREEN, imageUrl: 'https://cdn.voxo.app/gifts/galaxy.png', coinPrice: 8888, sortOrder: 30 },
    { name: 'Universe', category: GiftCategory.VIP, type: GiftType.FULLSCREEN, imageUrl: 'https://cdn.voxo.app/gifts/universe.png', coinPrice: 30000, sortOrder: 31 },
    { name: 'Crown', category: GiftCategory.VIP, type: GiftType.SVGA, imageUrl: 'https://cdn.voxo.app/gifts/crown.png', coinPrice: 2000, sortOrder: 32 },
    { name: 'Dragon', category: GiftCategory.VIP, type: GiftType.FULLSCREEN, imageUrl: 'https://cdn.voxo.app/gifts/dragon.png', coinPrice: 10000, sortOrder: 33 },
    { name: 'Unicorn', category: GiftCategory.VIP, type: GiftType.FULLSCREEN, imageUrl: 'https://cdn.voxo.app/gifts/unicorn.png', coinPrice: 5000, sortOrder: 34 },
    { name: 'Space Rocket', category: GiftCategory.VIP, type: GiftType.FULLSCREEN, imageUrl: 'https://cdn.voxo.app/gifts/space-rocket.png', coinPrice: 50000, sortOrder: 35 },

    // ===== LUCKY (server-side multiplier) =====
    { name: 'Lucky Bag', category: GiftCategory.LUCKY, type: GiftType.LOTTIE, imageUrl: 'https://cdn.voxo.app/gifts/lucky-bag.png', coinPrice: 100, sortOrder: 40 },
    { name: 'Lucky Box', category: GiftCategory.LUCKY, type: GiftType.SVGA, imageUrl: 'https://cdn.voxo.app/gifts/lucky-box.png', coinPrice: 500, sortOrder: 41 },
    { name: 'Fortune Wheel', category: GiftCategory.LUCKY, type: GiftType.FULLSCREEN, imageUrl: 'https://cdn.voxo.app/gifts/fortune-wheel.png', coinPrice: 1000, sortOrder: 42 },
    { name: 'Lucky Star', category: GiftCategory.LUCKY, type: GiftType.LOTTIE, imageUrl: 'https://cdn.voxo.app/gifts/lucky-star.png', coinPrice: 200, sortOrder: 43 },

    // ===== LUCKY FRUIT (server-side multiplier) =====
    { name: 'Apple', category: GiftCategory.LUCKY_FRUIT, type: GiftType.LOTTIE, imageUrl: 'https://cdn.voxo.app/gifts/apple.png', coinPrice: 50, sortOrder: 50 },
    { name: 'Watermelon', category: GiftCategory.LUCKY_FRUIT, type: GiftType.LOTTIE, imageUrl: 'https://cdn.voxo.app/gifts/watermelon.png', coinPrice: 80, sortOrder: 51 },
    { name: 'Cherry', category: GiftCategory.LUCKY_FRUIT, type: GiftType.STATIC, imageUrl: 'https://cdn.voxo.app/gifts/cherry.png', coinPrice: 30, sortOrder: 52 },
    { name: 'Lemon', category: GiftCategory.LUCKY_FRUIT, type: GiftType.STATIC, imageUrl: 'https://cdn.voxo.app/gifts/lemon.png', coinPrice: 20, sortOrder: 53 },
    { name: 'Grape', category: GiftCategory.LUCKY_FRUIT, type: GiftType.LOTTIE, imageUrl: 'https://cdn.voxo.app/gifts/grape.png', coinPrice: 40, sortOrder: 54 },
    { name: 'Strawberry', category: GiftCategory.LUCKY_FRUIT, type: GiftType.LOTTIE, imageUrl: 'https://cdn.voxo.app/gifts/strawberry.png', coinPrice: 35, sortOrder: 55 },

    // ===== COUPLE =====
    { name: 'Wedding Ring', category: GiftCategory.COUPLE, type: GiftType.SVGA, imageUrl: 'https://cdn.voxo.app/gifts/wedding-ring.png', coinPrice: 1000, sortOrder: 60 },
    { name: 'Couple Locket', category: GiftCategory.COUPLE, type: GiftType.LOTTIE, imageUrl: 'https://cdn.voxo.app/gifts/couple-locket.png', coinPrice: 200, sortOrder: 61 },
    { name: 'Love Boat', category: GiftCategory.COUPLE, type: GiftType.FULLSCREEN, imageUrl: 'https://cdn.voxo.app/gifts/love-boat.png', coinPrice: 3000, sortOrder: 62 },
    { name: 'Couple Dance', category: GiftCategory.COUPLE, type: GiftType.FULLSCREEN, imageUrl: 'https://cdn.voxo.app/gifts/couple-dance.png', coinPrice: 5000, sortOrder: 63 },

    // ===== RELATIONSHIP =====
    { name: 'Forever Rose', category: GiftCategory.RELATIONSHIP, type: GiftType.FULLSCREEN, imageUrl: 'https://cdn.voxo.app/gifts/forever-rose.png', coinPrice: 2000, sortOrder: 70 },
    { name: 'Heart Lock', category: GiftCategory.RELATIONSHIP, type: GiftType.SVGA, imageUrl: 'https://cdn.voxo.app/gifts/heart-lock.png', coinPrice: 500, sortOrder: 71 },
    { name: 'Infinite Love', category: GiftCategory.RELATIONSHIP, type: GiftType.FULLSCREEN, imageUrl: 'https://cdn.voxo.app/gifts/infinite-love.png', coinPrice: 10000, sortOrder: 72 },
    { name: 'Soul Mate', category: GiftCategory.RELATIONSHIP, type: GiftType.FULLSCREEN, imageUrl: 'https://cdn.voxo.app/gifts/soul-mate.png', coinPrice: 20000, sortOrder: 73 },

    // ===== ARISTOCRACY =====
    { name: 'Royal Crown', category: GiftCategory.ARISTOCRACY, type: GiftType.FULLSCREEN, imageUrl: 'https://cdn.voxo.app/gifts/royal-crown.png', coinPrice: 50000, sortOrder: 80 },
    { name: 'Diamond Throne', category: GiftCategory.ARISTOCRACY, type: GiftType.FULLSCREEN, imageUrl: 'https://cdn.voxo.app/gifts/diamond-throne.png', coinPrice: 100000, sortOrder: 81 },
    { name: 'Imperial Palace', category: GiftCategory.ARISTOCRACY, type: GiftType.FULLSCREEN, imageUrl: 'https://cdn.voxo.app/gifts/imperial-palace.png', coinPrice: 200000, sortOrder: 82 },
    { name: 'God of Wealth', category: GiftCategory.ARISTOCRACY, type: GiftType.FULLSCREEN, imageUrl: 'https://cdn.voxo.app/gifts/god-wealth.png', coinPrice: 500000, sortOrder: 83 },

    // ===== NATION =====
    { name: 'Uzbekistan Flag', category: GiftCategory.NATION, type: GiftType.SVGA, imageUrl: 'https://cdn.voxo.app/gifts/flag-uz.png', coinPrice: 100, sortOrder: 90 },
    { name: 'Silk Road', category: GiftCategory.NATION, type: GiftType.FULLSCREEN, imageUrl: 'https://cdn.voxo.app/gifts/silk-road.png', coinPrice: 500, sortOrder: 91 },
    { name: 'Samarkand', category: GiftCategory.NATION, type: GiftType.FULLSCREEN, imageUrl: 'https://cdn.voxo.app/gifts/samarkand.png', coinPrice: 1000, sortOrder: 92 },

    // ===== FAMILY =====
    { name: 'Family Shield', category: GiftCategory.FAMILY, type: GiftType.SVGA, imageUrl: 'https://cdn.voxo.app/gifts/family-shield.png', coinPrice: 300, sortOrder: 100 },
    { name: 'Fireworks', category: GiftCategory.FAMILY, type: GiftType.SVGA, imageUrl: 'https://cdn.voxo.app/gifts/fireworks.png', coinPrice: 60, sortOrder: 101 },
    { name: 'Family Castle', category: GiftCategory.FAMILY, type: GiftType.FULLSCREEN, imageUrl: 'https://cdn.voxo.app/gifts/family-castle.png', coinPrice: 5000, sortOrder: 102 },
  ];

  let created = 0;
  for (const gift of gifts) {
    const existing = await prisma.gift.findFirst({ where: { name: gift.name } });
    if (!existing) {
      await prisma.gift.create({ data: { ...gift, diamondPrice: Math.floor(gift.coinPrice * 0.7), isActive: true } });
      created++;
    }
  }

  console.log(`  Seeded ${created} new gifts (${gifts.length} total defined).`);
  return gifts.length;
}

async function seedLuckyGiftConfigs() {
  console.log('Seeding lucky gift configs...');

  const luckyGifts = await prisma.gift.findMany({
    where: { category: { in: ['LUCKY', 'LUCKY_FRUIT'] } },
  });

  let created = 0;
  for (const gift of luckyGifts) {
    const existing = await prisma.luckyGiftConfig.findUnique({ where: { giftId: gift.id } });
    if (!existing) {
      await prisma.luckyGiftConfig.create({
        data: {
          giftId: gift.id,
          isActive: true,
          minMultiplier: 1,
          maxMultiplier: gift.category === 'LUCKY' ? 10 : 5,
          jackpotChanceBps: 100,    // 1% jackpot chance
          poolContributionBps: 500, // 5% to jackpot pool
          houseEdgeBps: 300,        // 3% house edge
          maxWinCoins: BigInt(gift.coinPrice * 100),
        },
      });
      created++;
    }
  }

  console.log(`  Seeded ${created} lucky gift configs.`);
}

async function seedEntranceEffects() {
  console.log('Seeding entrance effects...');

  const effects = [
    { name: 'Bronze Entry', animationUrl: 'https://cdn.voxo.app/effects/bronze-entry.svga', coinPrice: 500, duration: 30, minVipLevel: 1, sortOrder: 1 },
    { name: 'Silver Entry', animationUrl: 'https://cdn.voxo.app/effects/silver-entry.svga', coinPrice: 1000, duration: 30, minVipLevel: 2, sortOrder: 2 },
    { name: 'Gold Entry', animationUrl: 'https://cdn.voxo.app/effects/gold-entry.svga', coinPrice: 2000, duration: 30, minVipLevel: 3, sortOrder: 3 },
    { name: 'Diamond Entry', animationUrl: 'https://cdn.voxo.app/effects/diamond-entry.svga', coinPrice: 5000, duration: 30, minVipLevel: 4, sortOrder: 4 },
    { name: 'Legendary Entry', animationUrl: 'https://cdn.voxo.app/effects/legendary-entry.svga', coinPrice: 10000, duration: 30, minVipLevel: 5, sortOrder: 5 },
  ];

  let created = 0;
  for (const effect of effects) {
    const existing = await prisma.entranceEffect.findFirst({ where: { name: effect.name } });
    if (!existing) {
      await prisma.entranceEffect.create({ data: { ...effect, isActive: true } });
      created++;
    }
  }

  console.log(`  Seeded ${created} entrance effects.`);
}

async function seedVehicles() {
  console.log('Seeding vehicles...');

  const vehicles = [
    // BRONZE level (BASIC)
    { name: 'Walking', level: VehicleLevel.BRONZE, animationUrl: 'https://cdn.voxo.app/vehicles/walking.svga', coinPrice: 0, duration: 0, isActive: true },
    { name: 'Bicycle', level: VehicleLevel.BRONZE, animationUrl: 'https://cdn.voxo.app/vehicles/bicycle.svga', coinPrice: 100, duration: 30, isActive: true },

    // SILVER level (NORMAL)
    { name: 'Motorcycle', level: VehicleLevel.SILVER, animationUrl: 'https://cdn.voxo.app/vehicles/motorcycle.svga', coinPrice: 500, duration: 30, isActive: true },
    { name: 'Car', level: VehicleLevel.SILVER, animationUrl: 'https://cdn.voxo.app/vehicles/car.svga', coinPrice: 1000, duration: 30, isActive: true },

    // GOLD level (RARE)
    { name: 'Sports Car', level: VehicleLevel.GOLD, animationUrl: 'https://cdn.voxo.app/vehicles/sports-car.svga', coinPrice: 5000, duration: 30, isActive: true },
    { name: 'Helicopter', level: VehicleLevel.GOLD, animationUrl: 'https://cdn.voxo.app/vehicles/helicopter.svga', coinPrice: 10000, duration: 30, isActive: true },

    // PLATINUM level (EPIC)
    { name: 'Yacht', level: VehicleLevel.PLATINUM, animationUrl: 'https://cdn.voxo.app/vehicles/yacht.svga', coinPrice: 50000, duration: 30, isActive: true },
    { name: 'Private Jet', level: VehicleLevel.PLATINUM, animationUrl: 'https://cdn.voxo.app/vehicles/private-jet.svga', coinPrice: 100000, duration: 30, isActive: true },

    // LEGENDARY level
    { name: 'Space Rocket', level: VehicleLevel.LEGENDARY, animationUrl: 'https://cdn.voxo.app/vehicles/space-rocket.svga', coinPrice: 500000, duration: 30, isActive: true },
    { name: 'Dragon Vehicle', level: VehicleLevel.LEGENDARY, animationUrl: 'https://cdn.voxo.app/vehicles/dragon-vehicle.svga', coinPrice: 1000000, duration: 30, isActive: true },
  ];

  for (const vehicle of vehicles) {
    const existing = await prisma.vehicle.findFirst({ where: { name: vehicle.name } });
    if (!existing) {
      await prisma.vehicle.create({ data: vehicle });
    }
  }

  console.log(`  Seeded ${vehicles.length} vehicles.`);
}

async function seedDailyRewards(testUsers: { id: string }[]) {
  console.log('Seeding daily rewards...');

  const dailyRewardSchedule = [
    { day: 1, reward: { coins: 100, diamonds: 0, description: 'Day 1 reward' } },
    { day: 2, reward: { coins: 150, diamonds: 0, description: 'Day 2 reward' } },
    { day: 3, reward: { coins: 200, diamonds: 5, description: 'Day 3 reward' } },
    { day: 4, reward: { coins: 300, diamonds: 0, description: 'Day 4 reward' } },
    { day: 5, reward: { coins: 400, diamonds: 10, description: 'Day 5 reward' } },
    { day: 6, reward: { coins: 500, diamonds: 0, description: 'Day 6 reward' } },
    { day: 7, reward: { coins: 1000, diamonds: 50, description: 'Day 7 special reward' } },
  ];

  // Seed daily rewards for first 3 test users to show some activity
  for (const user of testUsers.slice(0, 3)) {
    for (const schedule of dailyRewardSchedule) {
      await prisma.dailyReward.upsert({
        where: { userId_day: { userId: user.id, day: schedule.day } },
        update: {},
        create: {
          userId: user.id,
          day: schedule.day,
          reward: schedule.reward,
          claimed: schedule.day <= 3, // First 3 days already claimed
          claimedAt: schedule.day <= 3 ? new Date(Date.now() - (3 - schedule.day) * 86400000) : null,
        },
      });
    }
  }

  console.log('  Daily rewards seeded.');
}

async function seedEvents() {
  console.log('Seeding events...');

  const now = new Date();

  const events = [
    {
      name: 'Spring Festival',
      description: 'Celebrate spring with amazing gifts and rewards! Top gifters win exclusive prizes.',
      type: EventType.GIFT_COMPETITION,
      startDate: new Date(now.getTime() - 7 * 86400000),
      endDate: new Date(now.getTime() + 7 * 86400000),
      rewards: { coins: 10000, diamonds: 500, title: 'Spring Champion', frame: 'spring_frame' },
      isActive: true,
      banner: 'https://cdn.voxo.app/events/spring-festival.jpg',
    },
    {
      name: 'Summer Battle',
      description: 'The ultimate summer recharge competition. Top rechargers take all!',
      type: EventType.RECHARGE_COMPETITION,
      startDate: new Date(now.getTime() + 30 * 86400000),
      endDate: new Date(now.getTime() + 60 * 86400000),
      rewards: { coins: 50000, diamonds: 2000, title: 'Summer King', frame: 'summer_frame' },
      isActive: true,
      banner: 'https://cdn.voxo.app/events/summer-battle.jpg',
    },
    {
      name: 'Winter Cup',
      description: 'The Winter Cup has ended. Thank you to all participants!',
      type: EventType.SEASONAL,
      startDate: new Date(now.getTime() - 60 * 86400000),
      endDate: new Date(now.getTime() - 30 * 86400000),
      rewards: { coins: 20000, diamonds: 1000, title: 'Winter Champion', frame: 'winter_frame' },
      isActive: false,
      banner: 'https://cdn.voxo.app/events/winter-cup.jpg',
    },
  ];

  for (const event of events) {
    const existing = await prisma.event.findFirst({ where: { name: event.name } });
    if (!existing) {
      await prisma.event.create({ data: event });
    }
  }

  console.log(`  Seeded ${events.length} events.`);
}

async function seedBanners() {
  console.log('Seeding banners...');

  const now = new Date();

  const banners = [
    {
      title: 'Join VIP Now',
      imageUrl: 'https://cdn.voxo.app/banners/vip-banner.jpg',
      linkType: LinkType.USER,
      linkValue: '/vip',
      isActive: true,
      sortOrder: 1,
      startDate: new Date(now.getTime() - 86400000),
      endDate: new Date(now.getTime() + 30 * 86400000),
    },
    {
      title: 'Top Rooms Live',
      imageUrl: 'https://cdn.voxo.app/banners/rooms-banner.jpg',
      linkType: LinkType.ROOM,
      linkValue: '/rooms',
      isActive: true,
      sortOrder: 2,
      startDate: new Date(now.getTime() - 86400000),
      endDate: new Date(now.getTime() + 30 * 86400000),
    },
    {
      title: 'Daily Rewards',
      imageUrl: 'https://cdn.voxo.app/banners/rewards-banner.jpg',
      linkType: LinkType.EVENT,
      linkValue: '/rewards',
      isActive: true,
      sortOrder: 3,
      startDate: new Date(now.getTime() - 86400000),
      endDate: new Date(now.getTime() + 30 * 86400000),
    },
  ];

  for (const banner of banners) {
    const existing = await prisma.banner.findFirst({ where: { title: banner.title } });
    if (!existing) {
      await prisma.banner.create({ data: banner });
    }
  }

  console.log(`  Seeded ${banners.length} banners.`);
}

async function seedRooms(adminId: string) {
  console.log('Seeding voice rooms...');

  const rooms = [
    {
      hostId: adminId,
      title: 'Chill Vibes Room',
      description: 'Relax and chat with friends. All welcome!',
      type: RoomType.PUBLIC,
      maxSeats: 8,
      isLive: true,
      coverImage: 'https://cdn.voxo.app/rooms/chill-vibes.jpg',
      tags: ['chill', 'music', 'social'],
    },
    {
      hostId: adminId,
      title: 'VIP Lounge',
      description: 'Exclusive VIP-only lounge for premium members.',
      type: RoomType.PRIVATE,
      maxSeats: 6,
      isLive: false,
      coverImage: 'https://cdn.voxo.app/rooms/vip-lounge.jpg',
      tags: ['vip', 'exclusive'],
    },
    {
      hostId: adminId,
      title: 'Music & Talk',
      description: 'Share music and great conversations!',
      type: RoomType.PUBLIC,
      maxSeats: 12,
      isLive: true,
      coverImage: 'https://cdn.voxo.app/rooms/music-talk.jpg',
      tags: ['music', 'talk', 'entertainment'],
    },
    {
      hostId: adminId,
      title: 'Study Session',
      description: 'Focus and study together in silence.',
      type: RoomType.PUBLIC,
      maxSeats: 4,
      isLive: false,
      coverImage: 'https://cdn.voxo.app/rooms/study-session.jpg',
      tags: ['study', 'focus', 'quiet'],
    },
    {
      hostId: adminId,
      title: 'Night Lounge',
      description: 'The best night vibes. Come and enjoy!',
      type: RoomType.PUBLIC,
      maxSeats: 16,
      isLive: true,
      coverImage: 'https://cdn.voxo.app/rooms/night-lounge.jpg',
      tags: ['night', 'party', 'music'],
    },
  ];

  for (const room of rooms) {
    const existing = await prisma.voiceRoom.findFirst({ where: { title: room.title, hostId: adminId } });
    if (!existing) {
      await prisma.voiceRoom.create({ data: room });
    }
  }

  console.log(`  Seeded ${rooms.length} voice rooms.`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seedRechargeProducts() {
  console.log('Seeding recharge products...');

  const products = [
    {
      productId: 'voxo_coin_1000000',
      title: '1,000,000 Tanga',
      type: RechargeProductType.COINS,
      baseAmount: BigInt(1000000),
      bonusAmount: BigInt(500000),
      priceUzs: 9900,
      isFirstRechargeOnly: false,
      isActive: true,
      sortOrder: 1,
    },
    {
      productId: 'voxo_coin_5000000',
      title: '5,000,000 Tanga',
      type: RechargeProductType.COINS,
      baseAmount: BigInt(5000000),
      bonusAmount: BigInt(1000000),
      priceUzs: 44900,
      isFirstRechargeOnly: false,
      isActive: true,
      sortOrder: 2,
    },
    {
      productId: 'voxo_coin_10000000',
      title: '10,000,000 Tanga',
      type: RechargeProductType.COINS,
      baseAmount: BigInt(10000000),
      bonusAmount: BigInt(1500000),
      priceUzs: 79900,
      isFirstRechargeOnly: false,
      isActive: true,
      sortOrder: 3,
    },
    {
      productId: 'voxo_diamond_100',
      title: '100 Olmos',
      type: RechargeProductType.DIAMONDS,
      baseAmount: BigInt(100),
      bonusAmount: BigInt(0),
      priceUzs: 9900,
      isFirstRechargeOnly: false,
      isActive: true,
      sortOrder: 4,
    },
    {
      productId: 'voxo_diamond_500',
      title: '500 Olmos',
      type: RechargeProductType.DIAMONDS,
      baseAmount: BigInt(500),
      bonusAmount: BigInt(0),
      priceUzs: 44900,
      isFirstRechargeOnly: false,
      isActive: true,
      sortOrder: 5,
    },
    {
      productId: 'voxo_diamond_1000',
      title: '1,000 Olmos',
      type: RechargeProductType.DIAMONDS,
      baseAmount: BigInt(1000),
      bonusAmount: BigInt(0),
      priceUzs: 79900,
      isFirstRechargeOnly: false,
      isActive: true,
      sortOrder: 6,
    },
    {
      productId: 'voxo_first_recharge_099',
      title: "Birinchi to'ldirish (990 so'm)",
      type: RechargeProductType.FIRST_RECHARGE,
      baseAmount: BigInt(100000),
      bonusAmount: BigInt(50000),
      priceUzs: 990,
      isFirstRechargeOnly: true,
      isActive: true,
      sortOrder: 1,
    },
    {
      productId: 'voxo_first_recharge_499',
      title: "Birinchi to'ldirish (4,900 so'm)",
      type: RechargeProductType.FIRST_RECHARGE,
      baseAmount: BigInt(500000),
      bonusAmount: BigInt(250000),
      priceUzs: 4900,
      isFirstRechargeOnly: true,
      isActive: true,
      sortOrder: 2,
    },
    {
      productId: 'voxo_first_recharge_999',
      title: "Birinchi to'ldirish (9,900 so'm)",
      type: RechargeProductType.FIRST_RECHARGE,
      baseAmount: BigInt(1000000),
      bonusAmount: BigInt(1000000),
      priceUzs: 9900,
      isFirstRechargeOnly: true,
      isActive: true,
      sortOrder: 3,
    },
  ];

  for (const product of products) {
    await prisma.rechargeProduct.upsert({
      where: { productId: product.productId },
      update: { ...product },
      create: { ...product },
    });
  }

  console.log(`  Seeded ${products.length} recharge products.`);

  // Seed jackpot pool (singleton)
  const existingPool = await prisma.jackpotPool.findFirst();
  if (!existingPool) {
    await prisma.jackpotPool.create({
      data: { totalCoins: BigInt(0) },
    });
    console.log('  Seeded jackpot pool.');
  }
}

// ---------------------------------------------------------------------------
// Stage 4 seed functions
// ---------------------------------------------------------------------------

async function seedNoblePlans() {
  console.log('Seeding noble plans...');

  const plans = [
    {
      tier: NobleTier.PRINCE,
      name: 'Shahzoda',
      monthlyPriceCoins: 50000,
      monthlyPriceDiamonds: 0,
      badgeUrl: 'https://cdn.voxo.app/noble/prince-badge.png',
      frameUrl: 'https://cdn.voxo.app/noble/prince-frame.png',
      entranceEffectUrl: 'https://cdn.voxo.app/noble/prince-entry.svga',
      profileCardUrl: 'https://cdn.voxo.app/noble/prince-card.png',
      coloredNameStyle: '#B8860B',
      dailyCoins: 500,
      expBoostPercent: 10,
      giftDiscountPercent: 5,
      exclusiveGiftAccess: false,
      roomIdentity: 'prince',
      isActive: true,
      sortOrder: 1,
    },
    {
      tier: NobleTier.NOBLE,
      name: 'Olijanob',
      monthlyPriceCoins: 150000,
      monthlyPriceDiamonds: 0,
      badgeUrl: 'https://cdn.voxo.app/noble/noble-badge.png',
      frameUrl: 'https://cdn.voxo.app/noble/noble-frame.png',
      entranceEffectUrl: 'https://cdn.voxo.app/noble/noble-entry.svga',
      profileCardUrl: 'https://cdn.voxo.app/noble/noble-card.png',
      coloredNameStyle: '#4169E1',
      dailyCoins: 1500,
      expBoostPercent: 20,
      giftDiscountPercent: 10,
      exclusiveGiftAccess: true,
      roomIdentity: 'noble',
      isActive: true,
      sortOrder: 2,
    },
    {
      tier: NobleTier.RULER,
      name: 'Hukmdor',
      monthlyPriceCoins: 500000,
      monthlyPriceDiamonds: 0,
      badgeUrl: 'https://cdn.voxo.app/noble/ruler-badge.png',
      frameUrl: 'https://cdn.voxo.app/noble/ruler-frame.png',
      entranceEffectUrl: 'https://cdn.voxo.app/noble/ruler-entry.svga',
      profileCardUrl: 'https://cdn.voxo.app/noble/ruler-card.png',
      coloredNameStyle: '#9400D3',
      dailyCoins: 5000,
      expBoostPercent: 35,
      giftDiscountPercent: 15,
      exclusiveGiftAccess: true,
      roomIdentity: 'ruler',
      isActive: true,
      sortOrder: 3,
    },
    {
      tier: NobleTier.PRESIDENT,
      name: 'Prezident',
      monthlyPriceCoins: 2000000,
      monthlyPriceDiamonds: 0,
      badgeUrl: 'https://cdn.voxo.app/noble/president-badge.png',
      frameUrl: 'https://cdn.voxo.app/noble/president-frame.png',
      entranceEffectUrl: 'https://cdn.voxo.app/noble/president-entry.svga',
      profileCardUrl: 'https://cdn.voxo.app/noble/president-card.png',
      coloredNameStyle: '#FFD700',
      dailyCoins: 20000,
      expBoostPercent: 50,
      giftDiscountPercent: 20,
      exclusiveGiftAccess: true,
      roomIdentity: 'president',
      isActive: true,
      sortOrder: 4,
    },
  ];

  for (const plan of plans) {
    await prisma.noblePlan.upsert({
      where: { tier: plan.tier },
      update: { ...plan },
      create: { ...plan },
    });
  }

  console.log(`  Seeded ${plans.length} noble plans.`);
}

async function seedPrestigeLevelRules() {
  console.log('Seeding prestige level rules...');

  // Lv.0 to Lv.30 thresholds
  const rules = [
    { level: 0, requiredPoints: 0 },
    { level: 1, requiredPoints: 100, rewardCoins: 500 },
    { level: 2, requiredPoints: 200, rewardCoins: 1000 },
    { level: 3, requiredPoints: 300, rewardCoins: 1500 },
    { level: 4, requiredPoints: 500, rewardCoins: 2000 },
    { level: 5, requiredPoints: 800, rewardCoins: 3000 },
    { level: 6, requiredPoints: 1500, rewardCoins: 5000 },
    { level: 7, requiredPoints: 2200, rewardCoins: 7000 },
    { level: 8, requiredPoints: 2900, rewardCoins: 10000 },
    { level: 9, requiredPoints: 3600, rewardCoins: 15000 },
    { level: 10, requiredPoints: 4400, rewardCoins: 20000 },
    { level: 11, requiredPoints: 5300, rewardCoins: 25000 },
    { level: 12, requiredPoints: 6500, rewardCoins: 30000 },
    { level: 13, requiredPoints: 8000, rewardCoins: 40000 },
    { level: 14, requiredPoints: 10000, rewardCoins: 50000 },
    { level: 15, requiredPoints: 12500, rewardCoins: 60000 },
    { level: 16, requiredPoints: 15500, rewardCoins: 75000 },
    { level: 17, requiredPoints: 19000, rewardCoins: 90000 },
    { level: 18, requiredPoints: 23000, rewardCoins: 110000 },
    { level: 19, requiredPoints: 28000, rewardCoins: 130000 },
    { level: 20, requiredPoints: 34000, rewardCoins: 160000 },
    { level: 21, requiredPoints: 41000, rewardCoins: 200000 },
    { level: 22, requiredPoints: 49000, rewardCoins: 240000 },
    { level: 23, requiredPoints: 58000, rewardCoins: 290000 },
    { level: 24, requiredPoints: 68000, rewardCoins: 340000 },
    { level: 25, requiredPoints: 80000, rewardCoins: 400000 },
    { level: 26, requiredPoints: 95000, rewardCoins: 500000 },
    { level: 27, requiredPoints: 115000, rewardCoins: 600000 },
    { level: 28, requiredPoints: 140000, rewardCoins: 750000 },
    { level: 29, requiredPoints: 170000, rewardCoins: 900000 },
    { level: 30, requiredPoints: 200000, rewardCoins: 1000000 },
  ];

  let created = 0;
  for (const rule of rules) {
    await prisma.prestigeLevelRule.upsert({
      where: { level: rule.level },
      update: { ...rule },
      create: { ...rule },
    });
    created++;
  }

  console.log(`  Seeded ${created} prestige level rules (Lv.0–Lv.30).`);
}

async function seedMedals() {
  console.log('Seeding medals...');

  const medals = [
    // ===== ACHIEVEMENT - Grade C =====
    { name: 'Birinchi Qadam', description: 'Birinchi marta tizimga kirish', imageUrl: 'https://cdn.voxo.app/medals/first-step.png', category: MedalCategory.ACHIEVEMENT, grade: AssetGrade.C, prestigeValue: 10 },
    { name: 'Yangi A\'zo', description: 'Profilni to\'ldirish', imageUrl: 'https://cdn.voxo.app/medals/new-member.png', category: MedalCategory.ACHIEVEMENT, grade: AssetGrade.C, prestigeValue: 15 },
    { name: 'Birinchi Sovg\'a', description: 'Birinchi sovg\'a yuborish', imageUrl: 'https://cdn.voxo.app/medals/first-gift.png', category: MedalCategory.ACHIEVEMENT, grade: AssetGrade.C, prestigeValue: 20 },
    { name: 'Suhbatchi', description: '10 ta xona tashrif buyurish', imageUrl: 'https://cdn.voxo.app/medals/chatty.png', category: MedalCategory.ACHIEVEMENT, grade: AssetGrade.C, prestigeValue: 25 },
    { name: 'Xush Kelibsiz', description: 'Birinchi hafta faolligi', imageUrl: 'https://cdn.voxo.app/medals/welcome.png', category: MedalCategory.ACHIEVEMENT, grade: AssetGrade.C, prestigeValue: 30 },

    // ===== ACHIEVEMENT - Grade B =====
    { name: 'Faol Ovchi', description: '100 ta sovg\'a yuborish', imageUrl: 'https://cdn.voxo.app/medals/active-hunter.png', category: MedalCategory.ACHIEVEMENT, grade: AssetGrade.B, prestigeValue: 80 },
    { name: 'Xona Yulduz', description: '5 ta xona ochish', imageUrl: 'https://cdn.voxo.app/medals/room-star.png', category: MedalCategory.ACHIEVEMENT, grade: AssetGrade.B, prestigeValue: 100 },
    { name: 'Avlod Yetakchi', description: 'Oilaga a\'zo bo\'lish', imageUrl: 'https://cdn.voxo.app/medals/family-leader.png', category: MedalCategory.ACHIEVEMENT, grade: AssetGrade.B, prestigeValue: 120 },
    { name: '7 Kunlik Streak', description: '7 kun ketma-ket kirish', imageUrl: 'https://cdn.voxo.app/medals/streak-7.png', category: MedalCategory.ACHIEVEMENT, grade: AssetGrade.B, prestigeValue: 150 },
    { name: 'VIP Do\'sti', description: 'VIP bo\'lish', imageUrl: 'https://cdn.voxo.app/medals/vip-friend.png', category: MedalCategory.ACHIEVEMENT, grade: AssetGrade.B, prestigeValue: 200 },

    // ===== ACHIEVEMENT - Grade A =====
    { name: 'Oltin Sovg\'a', description: '1000 ta sovg\'a yuborish', imageUrl: 'https://cdn.voxo.app/medals/golden-gift.png', category: MedalCategory.ACHIEVEMENT, grade: AssetGrade.A, prestigeValue: 400 },
    { name: 'Millioner', description: '1,000,000 coin sarflash', imageUrl: 'https://cdn.voxo.app/medals/millioner.png', category: MedalCategory.ACHIEVEMENT, grade: AssetGrade.A, prestigeValue: 500 },
    { name: 'Ustoz', description: '10 ta do\'st taklif qilish', imageUrl: 'https://cdn.voxo.app/medals/mentor.png', category: MedalCategory.ACHIEVEMENT, grade: AssetGrade.A, prestigeValue: 600 },
    { name: 'Dubl Chempion', description: 'PK jangda 10 marta g\'alaba', imageUrl: 'https://cdn.voxo.app/medals/dual-champion.png', category: MedalCategory.ACHIEVEMENT, grade: AssetGrade.A, prestigeValue: 700 },
    { name: '30 Kunlik Streak', description: '30 kun ketma-ket kirish', imageUrl: 'https://cdn.voxo.app/medals/streak-30.png', category: MedalCategory.ACHIEVEMENT, grade: AssetGrade.A, prestigeValue: 800 },

    // ===== ACHIEVEMENT - Grade S =====
    { name: 'Aristokrat', description: 'Noble obuna olish', imageUrl: 'https://cdn.voxo.app/medals/aristocrat.png', category: MedalCategory.ACHIEVEMENT, grade: AssetGrade.S, prestigeValue: 1200 },
    { name: 'Xazinachi', description: '10,000,000 coin sarflash', imageUrl: 'https://cdn.voxo.app/medals/treasurer.png', category: MedalCategory.ACHIEVEMENT, grade: AssetGrade.S, prestigeValue: 1500 },
    { name: 'Afsonaviy', description: 'Barcha gift kategoriyalarini yuborish', imageUrl: 'https://cdn.voxo.app/medals/legendary.png', category: MedalCategory.ACHIEVEMENT, grade: AssetGrade.S, prestigeValue: 2000 },
    { name: 'Super VIP', description: 'VIP5+ darajasiga yetish', imageUrl: 'https://cdn.voxo.app/medals/super-vip.png', category: MedalCategory.ACHIEVEMENT, grade: AssetGrade.S, prestigeValue: 2500 },
    { name: 'Imperiya Quruvchi', description: 'Oilani 50 a\'zoga yetkazish', imageUrl: 'https://cdn.voxo.app/medals/empire-builder.png', category: MedalCategory.ACHIEVEMENT, grade: AssetGrade.S, prestigeValue: 3000 },

    // ===== ACHIEVEMENT - Grade SS =====
    { name: 'Prezident', description: 'President Noble darajasiga erishish', imageUrl: 'https://cdn.voxo.app/medals/president-medal.png', category: MedalCategory.ACHIEVEMENT, grade: AssetGrade.SS, prestigeValue: 5000 },
    { name: 'Dunyoning Eng Saxiy', description: '100,000,000 coin sovg\'a yuborish', imageUrl: 'https://cdn.voxo.app/medals/worlds-generous.png', category: MedalCategory.ACHIEVEMENT, grade: AssetGrade.SS, prestigeValue: 8000 },
    { name: 'Afsonaviy Lider', description: 'Liderlar jadvalida 1-o\'rin', imageUrl: 'https://cdn.voxo.app/medals/legend-leader.png', category: MedalCategory.ACHIEVEMENT, grade: AssetGrade.SS, prestigeValue: 10000 },

    // ===== EVENT medals =====
    { name: 'Bahor Festivali', description: 'Bahor festivalida qatnashish', imageUrl: 'https://cdn.voxo.app/medals/spring-festival.png', category: MedalCategory.EVENT, grade: AssetGrade.B, prestigeValue: 100 },
    { name: 'Yoz Chempioni', description: 'Yoz musobaqasida g\'alaba', imageUrl: 'https://cdn.voxo.app/medals/summer-champ.png', category: MedalCategory.EVENT, grade: AssetGrade.A, prestigeValue: 400 },
    { name: 'Qish Qahramoni', description: 'Qish kubogi sohibi', imageUrl: 'https://cdn.voxo.app/medals/winter-hero.png', category: MedalCategory.EVENT, grade: AssetGrade.A, prestigeValue: 500 },
    { name: 'Navro\'z Tantanasi', description: 'Navro\'z festivalida faollik', imageUrl: 'https://cdn.voxo.app/medals/navruz.png', category: MedalCategory.EVENT, grade: AssetGrade.B, prestigeValue: 150 },
    { name: 'Mustaqillik Kuni', description: 'Mustaqillik kuni maxsus tadbiri', imageUrl: 'https://cdn.voxo.app/medals/independence.png', category: MedalCategory.EVENT, grade: AssetGrade.A, prestigeValue: 350 },
    { name: 'Yillik Grand Prix', description: 'Yillik eng yaxshi foydalanuvchi', imageUrl: 'https://cdn.voxo.app/medals/annual-prix.png', category: MedalCategory.EVENT, grade: AssetGrade.SS, prestigeValue: 6000 },
    { name: 'Top Gifter Oylik', description: 'Oylik sovg\'a reyting top-3', imageUrl: 'https://cdn.voxo.app/medals/top-gifter-monthly.png', category: MedalCategory.EVENT, grade: AssetGrade.S, prestigeValue: 2000 },
    { name: 'Maxsus Mehmon', description: 'Maxsus tadbirda qatnashish', imageUrl: 'https://cdn.voxo.app/medals/special-guest.png', category: MedalCategory.EVENT, grade: AssetGrade.C, prestigeValue: 50 },

    // ===== GIFT medals =====
    { name: 'Gul Sevgi', description: '100 ta Atirgul yuborish', imageUrl: 'https://cdn.voxo.app/medals/rose-lover.png', category: MedalCategory.GIFT, grade: AssetGrade.C, prestigeValue: 30 },
    { name: 'Brilyant Yurak', description: '50 ta Brilyant sovg\'a yuborish', imageUrl: 'https://cdn.voxo.app/medals/diamond-heart.png', category: MedalCategory.GIFT, grade: AssetGrade.B, prestigeValue: 120 },
    { name: 'Omad Shohi', description: '100 ta Lucky sovg\'a yuborish', imageUrl: 'https://cdn.voxo.app/medals/lucky-king.png', category: MedalCategory.GIFT, grade: AssetGrade.A, prestigeValue: 450 },
    { name: 'Ko\'chmas Mulk', description: 'Qal\'a sovg\'asini yuborish', imageUrl: 'https://cdn.voxo.app/medals/castle-owner.png', category: MedalCategory.GIFT, grade: AssetGrade.A, prestigeValue: 500 },
    { name: 'Koinot Beruvchi', description: 'Koinot sovg\'asini yuborish', imageUrl: 'https://cdn.voxo.app/medals/universe-giver.png', category: MedalCategory.GIFT, grade: AssetGrade.S, prestigeValue: 1500 },
    { name: 'Muhabbat Qahramoni', description: '1000 ta Relationship sovg\'a yuborish', imageUrl: 'https://cdn.voxo.app/medals/love-hero.png', category: MedalCategory.GIFT, grade: AssetGrade.S, prestigeValue: 2000 },
    { name: 'Jackpot G\'olibi', description: 'Jackpot yutish', imageUrl: 'https://cdn.voxo.app/medals/jackpot-winner.png', category: MedalCategory.GIFT, grade: AssetGrade.SS, prestigeValue: 5000 },
    { name: 'Aristokrat Saxiy', description: 'Aristocracy sovg\'asini yuborish', imageUrl: 'https://cdn.voxo.app/medals/aristocrat-gift.png', category: MedalCategory.GIFT, grade: AssetGrade.SS, prestigeValue: 4000 },
    { name: 'Meva Bahosi', description: '50 ta Lucky Fruit yuborish', imageUrl: 'https://cdn.voxo.app/medals/fruit-master.png', category: MedalCategory.GIFT, grade: AssetGrade.B, prestigeValue: 180 },
    { name: 'Juft Yurak', description: '20 ta Couple sovg\'a yuborish', imageUrl: 'https://cdn.voxo.app/medals/couple-heart.png', category: MedalCategory.GIFT, grade: AssetGrade.B, prestigeValue: 200 },
  ];

  let created = 0;
  for (const medal of medals) {
    const existing = await prisma.medal.findFirst({ where: { name: medal.name } });
    if (!existing) {
      await prisma.medal.create({ data: { ...medal, isActive: true } });
      created++;
    }
  }

  console.log(`  Seeded ${created} new medals (${medals.length} total defined).`);
}

async function seedShopItems() {
  console.log('Seeding shop items...');

  const items = [
    // ===== FRAMES =====
    { category: ShopCategory.FRAME, title: 'Bronza Ramka', imageUrl: 'https://cdn.voxo.app/frames/bronze-frame.png', grade: AssetGrade.C, priceCoins: 500, durationDays: 30, isPermanent: false, sortOrder: 1 },
    { category: ShopCategory.FRAME, title: 'Kumush Ramka', imageUrl: 'https://cdn.voxo.app/frames/silver-frame.png', grade: AssetGrade.B, priceCoins: 1200, durationDays: 30, isPermanent: false, sortOrder: 2 },
    { category: ShopCategory.FRAME, title: 'Oltin Ramka', imageUrl: 'https://cdn.voxo.app/frames/gold-frame.png', grade: AssetGrade.A, priceCoins: 3000, durationDays: 30, isPermanent: false, sortOrder: 3 },
    { category: ShopCategory.FRAME, title: 'Platina Ramka', imageUrl: 'https://cdn.voxo.app/frames/platinum-frame.png', grade: AssetGrade.S, priceCoins: 8000, isPermanent: true, sortOrder: 4 },
    { category: ShopCategory.FRAME, title: 'Brilyant Ramka', imageUrl: 'https://cdn.voxo.app/frames/diamond-frame.png', grade: AssetGrade.S, priceCoins: 15000, isPermanent: true, sortOrder: 5 },
    { category: ShopCategory.FRAME, title: 'Afsonaviy Ramka', imageUrl: 'https://cdn.voxo.app/frames/legendary-frame.png', grade: AssetGrade.SS, priceCoins: 50000, isPermanent: true, sortOrder: 6 },
    { category: ShopCategory.FRAME, title: 'Shahzoda Ramkasi', imageUrl: 'https://cdn.voxo.app/frames/prince-frame.png', grade: AssetGrade.SS, priceCoins: 100000, isPermanent: true, nobleRequired: 'PRINCE', sortOrder: 7 },
    { category: ShopCategory.FRAME, title: 'Prezident Ramkasi', imageUrl: 'https://cdn.voxo.app/frames/president-frame.png', grade: AssetGrade.SS, priceCoins: 500000, isPermanent: true, nobleRequired: 'PRESIDENT', sortOrder: 8 },
    { category: ShopCategory.FRAME, title: 'Bahor Ramkasi', imageUrl: 'https://cdn.voxo.app/frames/spring-frame.png', grade: AssetGrade.A, priceCoins: 2500, durationDays: 7, isPermanent: false, sortOrder: 9 },
    { category: ShopCategory.FRAME, title: 'Atirgul Ramkasi', imageUrl: 'https://cdn.voxo.app/frames/rose-frame.png', grade: AssetGrade.B, priceCoins: 1500, durationDays: 15, isPermanent: false, sortOrder: 10 },
    { category: ShopCategory.FRAME, title: 'Neon Ramka', imageUrl: 'https://cdn.voxo.app/frames/neon-frame.png', grade: AssetGrade.A, priceCoins: 4000, durationDays: 30, isPermanent: false, sortOrder: 11 },
    { category: ShopCategory.FRAME, title: 'Galaktika Ramkasi', imageUrl: 'https://cdn.voxo.app/frames/galaxy-frame.png', grade: AssetGrade.S, priceCoins: 20000, isPermanent: true, vipRequired: 3, sortOrder: 12 },
    { category: ShopCategory.FRAME, title: 'Rainbow Ramka', imageUrl: 'https://cdn.voxo.app/frames/rainbow-frame.png', grade: AssetGrade.A, priceCoins: 3500, durationDays: 30, isPermanent: false, sortOrder: 13 },
    { category: ShopCategory.FRAME, title: 'Dragon Ramkasi', imageUrl: 'https://cdn.voxo.app/frames/dragon-frame.png', grade: AssetGrade.S, priceCoins: 25000, isPermanent: true, vipRequired: 4, sortOrder: 14 },
    { category: ShopCategory.FRAME, title: 'Qirol Ramkasi', imageUrl: 'https://cdn.voxo.app/frames/king-frame.png', grade: AssetGrade.SS, priceCoins: 80000, isPermanent: true, sortOrder: 15 },
    { category: ShopCategory.FRAME, title: 'Oy Ramkasi', imageUrl: 'https://cdn.voxo.app/frames/moon-frame.png', grade: AssetGrade.B, priceCoins: 2000, durationDays: 30, isPermanent: false, sortOrder: 16 },
    { category: ShopCategory.FRAME, title: 'Ninja Ramkasi', imageUrl: 'https://cdn.voxo.app/frames/ninja-frame.png', grade: AssetGrade.A, priceCoins: 5000, durationDays: 30, isPermanent: false, sortOrder: 17 },
    { category: ShopCategory.FRAME, title: 'Kitty Ramkasi', imageUrl: 'https://cdn.voxo.app/frames/kitty-frame.png', grade: AssetGrade.C, priceCoins: 800, durationDays: 30, isPermanent: false, sortOrder: 18 },
    { category: ShopCategory.FRAME, title: 'Angel Ramkasi', imageUrl: 'https://cdn.voxo.app/frames/angel-frame.png', grade: AssetGrade.S, priceCoins: 18000, isPermanent: true, sortOrder: 19 },
    { category: ShopCategory.FRAME, title: 'Pixel Ramka', imageUrl: 'https://cdn.voxo.app/frames/pixel-frame.png', grade: AssetGrade.C, priceCoins: 300, durationDays: 7, isPermanent: false, sortOrder: 20 },

    // ===== ENTRANCE EFFECTS =====
    { category: ShopCategory.ENTRANCE_EFFECT, title: 'Bronza Kirish', animationUrl: 'https://cdn.voxo.app/effects/bronze-entry.svga', grade: AssetGrade.C, priceCoins: 600, durationDays: 30, isPermanent: false, sortOrder: 1 },
    { category: ShopCategory.ENTRANCE_EFFECT, title: 'Kumush Kirish', animationUrl: 'https://cdn.voxo.app/effects/silver-entry.svga', grade: AssetGrade.B, priceCoins: 1500, durationDays: 30, isPermanent: false, sortOrder: 2 },
    { category: ShopCategory.ENTRANCE_EFFECT, title: 'Oltin Kirish', animationUrl: 'https://cdn.voxo.app/effects/gold-entry.svga', grade: AssetGrade.A, priceCoins: 4000, durationDays: 30, isPermanent: false, sortOrder: 3 },
    { category: ShopCategory.ENTRANCE_EFFECT, title: 'Brilyant Kirish', animationUrl: 'https://cdn.voxo.app/effects/diamond-entry.svga', grade: AssetGrade.S, priceCoins: 12000, isPermanent: true, sortOrder: 4 },
    { category: ShopCategory.ENTRANCE_EFFECT, title: 'Afsonaviy Kirish', animationUrl: 'https://cdn.voxo.app/effects/legendary-entry.svga', grade: AssetGrade.SS, priceCoins: 60000, isPermanent: true, sortOrder: 5 },
    { category: ShopCategory.ENTRANCE_EFFECT, title: 'Gul Yomg\'iri', animationUrl: 'https://cdn.voxo.app/effects/flower-rain.svga', grade: AssetGrade.A, priceCoins: 3500, durationDays: 30, isPermanent: false, sortOrder: 6 },
    { category: ShopCategory.ENTRANCE_EFFECT, title: 'Sharob Sharob', animationUrl: 'https://cdn.voxo.app/effects/champagne.svga', grade: AssetGrade.B, priceCoins: 2000, durationDays: 30, isPermanent: false, sortOrder: 7 },
    { category: ShopCategory.ENTRANCE_EFFECT, title: 'Dragon Kirish', animationUrl: 'https://cdn.voxo.app/effects/dragon-entry.svga', grade: AssetGrade.SS, priceCoins: 80000, isPermanent: true, vipRequired: 5, sortOrder: 8 },
    { category: ShopCategory.ENTRANCE_EFFECT, title: 'Confetti', animationUrl: 'https://cdn.voxo.app/effects/confetti.svga', grade: AssetGrade.C, priceCoins: 400, durationDays: 15, isPermanent: false, sortOrder: 9 },
    { category: ShopCategory.ENTRANCE_EFFECT, title: 'Lightning', animationUrl: 'https://cdn.voxo.app/effects/lightning.svga', grade: AssetGrade.A, priceCoins: 5000, durationDays: 30, isPermanent: false, sortOrder: 10 },
    { category: ShopCategory.ENTRANCE_EFFECT, title: 'Galaxy Entry', animationUrl: 'https://cdn.voxo.app/effects/galaxy-entry.svga', grade: AssetGrade.S, priceCoins: 20000, isPermanent: true, sortOrder: 11 },
    { category: ShopCategory.ENTRANCE_EFFECT, title: 'Snowflake', animationUrl: 'https://cdn.voxo.app/effects/snowflake.svga', grade: AssetGrade.B, priceCoins: 1800, durationDays: 30, isPermanent: false, sortOrder: 12 },
    { category: ShopCategory.ENTRANCE_EFFECT, title: 'Prezident Kirishi', animationUrl: 'https://cdn.voxo.app/effects/president-entry.svga', grade: AssetGrade.SS, priceCoins: 200000, isPermanent: true, nobleRequired: 'PRESIDENT', sortOrder: 13 },
    { category: ShopCategory.ENTRANCE_EFFECT, title: 'Rainbow Arc', animationUrl: 'https://cdn.voxo.app/effects/rainbow-arc.svga', grade: AssetGrade.A, priceCoins: 4500, durationDays: 30, isPermanent: false, sortOrder: 14 },
    { category: ShopCategory.ENTRANCE_EFFECT, title: 'Firework Burst', animationUrl: 'https://cdn.voxo.app/effects/firework-burst.svga', grade: AssetGrade.S, priceCoins: 15000, isPermanent: true, sortOrder: 15 },

    // ===== CHAT BUBBLES =====
    { category: ShopCategory.CHAT_BUBBLE, title: 'Ko\'k Pufakcha', imageUrl: 'https://cdn.voxo.app/chat/bubble-blue.png', grade: AssetGrade.C, priceCoins: 300, durationDays: 30, isPermanent: false, sortOrder: 1 },
    { category: ShopCategory.CHAT_BUBBLE, title: 'Pushti Pufakcha', imageUrl: 'https://cdn.voxo.app/chat/bubble-pink.png', grade: AssetGrade.C, priceCoins: 350, durationDays: 30, isPermanent: false, sortOrder: 2 },
    { category: ShopCategory.CHAT_BUBBLE, title: 'Oltin Pufakcha', imageUrl: 'https://cdn.voxo.app/chat/bubble-gold.png', grade: AssetGrade.B, priceCoins: 800, durationDays: 30, isPermanent: false, sortOrder: 3 },
    { category: ShopCategory.CHAT_BUBBLE, title: 'Neon Pufakcha', imageUrl: 'https://cdn.voxo.app/chat/bubble-neon.png', grade: AssetGrade.A, priceCoins: 2000, durationDays: 30, isPermanent: false, sortOrder: 4 },
    { category: ShopCategory.CHAT_BUBBLE, title: 'Qirol Pufakcha', imageUrl: 'https://cdn.voxo.app/chat/bubble-royal.png', grade: AssetGrade.S, priceCoins: 8000, isPermanent: true, sortOrder: 5 },
    { category: ShopCategory.CHAT_BUBBLE, title: 'Kristal Pufakcha', imageUrl: 'https://cdn.voxo.app/chat/bubble-crystal.png', grade: AssetGrade.SS, priceCoins: 30000, isPermanent: true, sortOrder: 6 },
    { category: ShopCategory.CHAT_BUBBLE, title: 'Bulut Pufakcha', imageUrl: 'https://cdn.voxo.app/chat/bubble-cloud.png', grade: AssetGrade.B, priceCoins: 1000, durationDays: 30, isPermanent: false, sortOrder: 7 },
    { category: ShopCategory.CHAT_BUBBLE, title: 'Rainbow Pufakcha', imageUrl: 'https://cdn.voxo.app/chat/bubble-rainbow.png', grade: AssetGrade.A, priceCoins: 2500, durationDays: 30, isPermanent: false, sortOrder: 8 },
    { category: ShopCategory.CHAT_BUBBLE, title: 'Kech Osmon', imageUrl: 'https://cdn.voxo.app/chat/bubble-night.png', grade: AssetGrade.A, priceCoins: 3000, durationDays: 30, isPermanent: false, sortOrder: 9 },
    { category: ShopCategory.CHAT_BUBBLE, title: 'Dragon Pufakcha', imageUrl: 'https://cdn.voxo.app/chat/bubble-dragon.png', grade: AssetGrade.SS, priceCoins: 50000, isPermanent: true, sortOrder: 10 },
    { category: ShopCategory.CHAT_BUBBLE, title: 'Qish Pufakcha', imageUrl: 'https://cdn.voxo.app/chat/bubble-winter.png', grade: AssetGrade.B, priceCoins: 900, durationDays: 15, isPermanent: false, sortOrder: 11 },
    { category: ShopCategory.CHAT_BUBBLE, title: 'Bahor Pufakcha', imageUrl: 'https://cdn.voxo.app/chat/bubble-spring.png', grade: AssetGrade.C, priceCoins: 500, durationDays: 7, isPermanent: false, sortOrder: 12 },
    { category: ShopCategory.CHAT_BUBBLE, title: 'Aniqa', imageUrl: 'https://cdn.voxo.app/chat/bubble-clean.png', grade: AssetGrade.C, priceCoins: 200, durationDays: 30, isPermanent: false, sortOrder: 13 },
    { category: ShopCategory.CHAT_BUBBLE, title: 'Binafsha Pufakcha', imageUrl: 'https://cdn.voxo.app/chat/bubble-purple.png', grade: AssetGrade.B, priceCoins: 1200, durationDays: 30, isPermanent: false, sortOrder: 14 },
    { category: ShopCategory.CHAT_BUBBLE, title: 'Galaktika Pufakcha', imageUrl: 'https://cdn.voxo.app/chat/bubble-galaxy.png', grade: AssetGrade.S, priceCoins: 10000, isPermanent: true, sortOrder: 15 },

    // ===== MIC DECORATIONS =====
    { category: ShopCategory.MIC_DECORATION, title: 'Bronza Mikrofon', imageUrl: 'https://cdn.voxo.app/mic/bronze-mic.png', grade: AssetGrade.C, priceCoins: 400, durationDays: 30, isPermanent: false, sortOrder: 1 },
    { category: ShopCategory.MIC_DECORATION, title: 'Kumush Mikrofon', imageUrl: 'https://cdn.voxo.app/mic/silver-mic.png', grade: AssetGrade.B, priceCoins: 1000, durationDays: 30, isPermanent: false, sortOrder: 2 },
    { category: ShopCategory.MIC_DECORATION, title: 'Oltin Mikrofon', imageUrl: 'https://cdn.voxo.app/mic/gold-mic.png', grade: AssetGrade.A, priceCoins: 2800, durationDays: 30, isPermanent: false, sortOrder: 3 },
    { category: ShopCategory.MIC_DECORATION, title: 'Kristal Mikrofon', imageUrl: 'https://cdn.voxo.app/mic/crystal-mic.png', grade: AssetGrade.S, priceCoins: 9000, isPermanent: true, sortOrder: 4 },
    { category: ShopCategory.MIC_DECORATION, title: 'Afsonaviy Mikrofon', imageUrl: 'https://cdn.voxo.app/mic/legendary-mic.png', grade: AssetGrade.SS, priceCoins: 40000, isPermanent: true, sortOrder: 5 },
    { category: ShopCategory.MIC_DECORATION, title: 'Neon Mikrofon', imageUrl: 'https://cdn.voxo.app/mic/neon-mic.png', grade: AssetGrade.A, priceCoins: 3500, durationDays: 30, isPermanent: false, sortOrder: 6 },
    { category: ShopCategory.MIC_DECORATION, title: 'Dragon Mikrofon', imageUrl: 'https://cdn.voxo.app/mic/dragon-mic.png', grade: AssetGrade.SS, priceCoins: 70000, isPermanent: true, vipRequired: 4, sortOrder: 7 },
    { category: ShopCategory.MIC_DECORATION, title: 'Rainbow Mikrofon', imageUrl: 'https://cdn.voxo.app/mic/rainbow-mic.png', grade: AssetGrade.A, priceCoins: 4000, durationDays: 30, isPermanent: false, sortOrder: 8 },
    { category: ShopCategory.MIC_DECORATION, title: 'Gul Mikrofon', imageUrl: 'https://cdn.voxo.app/mic/flower-mic.png', grade: AssetGrade.B, priceCoins: 1500, durationDays: 30, isPermanent: false, sortOrder: 9 },
    { category: ShopCategory.MIC_DECORATION, title: 'Koinot Mikrofon', imageUrl: 'https://cdn.voxo.app/mic/galaxy-mic.png', grade: AssetGrade.S, priceCoins: 15000, isPermanent: true, sortOrder: 10 },
    { category: ShopCategory.MIC_DECORATION, title: 'Sevgi Mikrofoni', imageUrl: 'https://cdn.voxo.app/mic/love-mic.png', grade: AssetGrade.B, priceCoins: 1200, durationDays: 30, isPermanent: false, sortOrder: 11 },
    { category: ShopCategory.MIC_DECORATION, title: 'Qirol Mikrofon', imageUrl: 'https://cdn.voxo.app/mic/king-mic.png', grade: AssetGrade.S, priceCoins: 12000, isPermanent: true, sortOrder: 12 },
    { category: ShopCategory.MIC_DECORATION, title: 'Asal Mikrofon', imageUrl: 'https://cdn.voxo.app/mic/honey-mic.png', grade: AssetGrade.C, priceCoins: 600, durationDays: 15, isPermanent: false, sortOrder: 13 },
    { category: ShopCategory.MIC_DECORATION, title: 'Muzshunoslik', imageUrl: 'https://cdn.voxo.app/mic/music-mic.png', grade: AssetGrade.A, priceCoins: 3000, durationDays: 30, isPermanent: false, sortOrder: 14 },
    { category: ShopCategory.MIC_DECORATION, title: 'Prezident Mikrofon', imageUrl: 'https://cdn.voxo.app/mic/president-mic.png', grade: AssetGrade.SS, priceCoins: 150000, isPermanent: true, nobleRequired: 'PRESIDENT', sortOrder: 15 },

    // ===== ROOM THEMES =====
    { category: ShopCategory.ROOM_THEME, title: 'Kech Ko\'k', imageUrl: 'https://cdn.voxo.app/themes/night-blue.jpg', grade: AssetGrade.C, priceCoins: 500, durationDays: 30, isPermanent: false, sortOrder: 1 },
    { category: ShopCategory.ROOM_THEME, title: 'Bahor Bog\'i', imageUrl: 'https://cdn.voxo.app/themes/spring-garden.jpg', grade: AssetGrade.B, priceCoins: 1200, durationDays: 30, isPermanent: false, sortOrder: 2 },
    { category: ShopCategory.ROOM_THEME, title: 'Galaktika', imageUrl: 'https://cdn.voxo.app/themes/galaxy.jpg', grade: AssetGrade.A, priceCoins: 3000, durationDays: 30, isPermanent: false, sortOrder: 3 },
    { category: ShopCategory.ROOM_THEME, title: 'Qirol Saroyi', imageUrl: 'https://cdn.voxo.app/themes/royal-palace.jpg', grade: AssetGrade.S, priceCoins: 10000, isPermanent: true, sortOrder: 4 },
    { category: ShopCategory.ROOM_THEME, title: 'Olmos Qal\'asi', imageUrl: 'https://cdn.voxo.app/themes/diamond-castle.jpg', grade: AssetGrade.SS, priceCoins: 50000, isPermanent: true, sortOrder: 5 },
    { category: ShopCategory.ROOM_THEME, title: 'Dengiz Tubida', imageUrl: 'https://cdn.voxo.app/themes/underwater.jpg', grade: AssetGrade.A, priceCoins: 2500, durationDays: 30, isPermanent: false, sortOrder: 6 },
    { category: ShopCategory.ROOM_THEME, title: 'Neon Shahar', imageUrl: 'https://cdn.voxo.app/themes/neon-city.jpg', grade: AssetGrade.A, priceCoins: 3500, durationDays: 30, isPermanent: false, sortOrder: 7 },
    { category: ShopCategory.ROOM_THEME, title: 'Yoqimli Qish', imageUrl: 'https://cdn.voxo.app/themes/cozy-winter.jpg', grade: AssetGrade.B, priceCoins: 1500, durationDays: 30, isPermanent: false, sortOrder: 8 },
    { category: ShopCategory.ROOM_THEME, title: 'Yashil O\'rmon', imageUrl: 'https://cdn.voxo.app/themes/forest.jpg', grade: AssetGrade.C, priceCoins: 700, durationDays: 30, isPermanent: false, sortOrder: 9 },
    { category: ShopCategory.ROOM_THEME, title: 'Quyosh Botishi', imageUrl: 'https://cdn.voxo.app/themes/sunset.jpg', grade: AssetGrade.B, priceCoins: 1800, durationDays: 30, isPermanent: false, sortOrder: 10 },
    { category: ShopCategory.ROOM_THEME, title: 'Dragon Eri', imageUrl: 'https://cdn.voxo.app/themes/dragon-lair.jpg', grade: AssetGrade.SS, priceCoins: 80000, isPermanent: true, vipRequired: 5, sortOrder: 11 },
    { category: ShopCategory.ROOM_THEME, title: 'Futuristik', imageUrl: 'https://cdn.voxo.app/themes/futuristic.jpg', grade: AssetGrade.S, priceCoins: 15000, isPermanent: true, sortOrder: 12 },
    { category: ShopCategory.ROOM_THEME, title: 'Japoniya Bog\'i', imageUrl: 'https://cdn.voxo.app/themes/japan-garden.jpg', grade: AssetGrade.A, priceCoins: 4000, durationDays: 30, isPermanent: false, sortOrder: 13 },
    { category: ShopCategory.ROOM_THEME, title: 'Romantik Gul', imageUrl: 'https://cdn.voxo.app/themes/romantic-rose.jpg', grade: AssetGrade.B, priceCoins: 2000, durationDays: 30, isPermanent: false, sortOrder: 14 },
    { category: ShopCategory.ROOM_THEME, title: 'Koinot Maydoni', imageUrl: 'https://cdn.voxo.app/themes/cosmic-arena.jpg', grade: AssetGrade.SS, priceCoins: 120000, isPermanent: true, sortOrder: 15 },

    // ===== PROFILE BACKGROUNDS =====
    { category: ShopCategory.PROFILE_BACKGROUND, title: 'Oddiy Fon', imageUrl: 'https://cdn.voxo.app/bg/plain-bg.jpg', grade: AssetGrade.C, priceCoins: 200, isPermanent: true, sortOrder: 1 },
    { category: ShopCategory.PROFILE_BACKGROUND, title: 'Ko\'k Gradient', imageUrl: 'https://cdn.voxo.app/bg/blue-gradient.jpg', grade: AssetGrade.C, priceCoins: 300, durationDays: 30, isPermanent: false, sortOrder: 2 },
    { category: ShopCategory.PROFILE_BACKGROUND, title: 'Rang-barang Fon', imageUrl: 'https://cdn.voxo.app/bg/colorful.jpg', grade: AssetGrade.B, priceCoins: 800, durationDays: 30, isPermanent: false, sortOrder: 3 },
    { category: ShopCategory.PROFILE_BACKGROUND, title: 'Galaktika Foni', imageUrl: 'https://cdn.voxo.app/bg/galaxy-bg.jpg', grade: AssetGrade.A, priceCoins: 2000, durationDays: 30, isPermanent: false, sortOrder: 4 },
    { category: ShopCategory.PROFILE_BACKGROUND, title: 'Oltin Fon', imageUrl: 'https://cdn.voxo.app/bg/golden-bg.jpg', grade: AssetGrade.S, priceCoins: 7000, isPermanent: true, sortOrder: 5 },
    { category: ShopCategory.PROFILE_BACKGROUND, title: 'Neon Fon', imageUrl: 'https://cdn.voxo.app/bg/neon-bg.jpg', grade: AssetGrade.A, priceCoins: 3000, durationDays: 30, isPermanent: false, sortOrder: 6 },
    { category: ShopCategory.PROFILE_BACKGROUND, title: 'Qirol Foni', imageUrl: 'https://cdn.voxo.app/bg/royal-bg.jpg', grade: AssetGrade.SS, priceCoins: 40000, isPermanent: true, sortOrder: 7 },
    { category: ShopCategory.PROFILE_BACKGROUND, title: 'Bahor Foni', imageUrl: 'https://cdn.voxo.app/bg/spring-bg.jpg', grade: AssetGrade.B, priceCoins: 1000, durationDays: 30, isPermanent: false, sortOrder: 8 },
    { category: ShopCategory.PROFILE_BACKGROUND, title: 'Romantik', imageUrl: 'https://cdn.voxo.app/bg/romantic-bg.jpg', grade: AssetGrade.B, priceCoins: 1200, durationDays: 30, isPermanent: false, sortOrder: 9 },
    { category: ShopCategory.PROFILE_BACKGROUND, title: 'Futuristik Fon', imageUrl: 'https://cdn.voxo.app/bg/futuristic-bg.jpg', grade: AssetGrade.S, priceCoins: 10000, isPermanent: true, sortOrder: 10 },

    // ===== NAMEPLATES =====
    { category: ShopCategory.NAMEPLATE, title: 'Oddiy Ism', imageUrl: 'https://cdn.voxo.app/nameplate/plain.png', grade: AssetGrade.C, priceCoins: 100, durationDays: 30, isPermanent: false, sortOrder: 1 },
    { category: ShopCategory.NAMEPLATE, title: 'Ko\'k Ism', imageUrl: 'https://cdn.voxo.app/nameplate/blue.png', grade: AssetGrade.C, priceCoins: 200, durationDays: 30, isPermanent: false, sortOrder: 2 },
    { category: ShopCategory.NAMEPLATE, title: 'Oltin Ism', imageUrl: 'https://cdn.voxo.app/nameplate/gold.png', grade: AssetGrade.B, priceCoins: 500, durationDays: 30, isPermanent: false, sortOrder: 3 },
    { category: ShopCategory.NAMEPLATE, title: 'Neon Ism', imageUrl: 'https://cdn.voxo.app/nameplate/neon.png', grade: AssetGrade.A, priceCoins: 1500, durationDays: 30, isPermanent: false, sortOrder: 4 },
    { category: ShopCategory.NAMEPLATE, title: 'Qirol Ismi', imageUrl: 'https://cdn.voxo.app/nameplate/royal.png', grade: AssetGrade.S, priceCoins: 5000, isPermanent: true, sortOrder: 5 },
    { category: ShopCategory.NAMEPLATE, title: 'Kristal Ism', imageUrl: 'https://cdn.voxo.app/nameplate/crystal.png', grade: AssetGrade.SS, priceCoins: 25000, isPermanent: true, sortOrder: 6 },
    { category: ShopCategory.NAMEPLATE, title: 'Rainbow Ism', imageUrl: 'https://cdn.voxo.app/nameplate/rainbow.png', grade: AssetGrade.A, priceCoins: 2000, durationDays: 30, isPermanent: false, sortOrder: 7 },
    { category: ShopCategory.NAMEPLATE, title: 'Dragon Ismi', imageUrl: 'https://cdn.voxo.app/nameplate/dragon.png', grade: AssetGrade.SS, priceCoins: 50000, isPermanent: true, sortOrder: 8 },
    { category: ShopCategory.NAMEPLATE, title: 'Galaktika Ismi', imageUrl: 'https://cdn.voxo.app/nameplate/galaxy.png', grade: AssetGrade.S, priceCoins: 8000, isPermanent: true, sortOrder: 9 },
    { category: ShopCategory.NAMEPLATE, title: 'Bahor Ismi', imageUrl: 'https://cdn.voxo.app/nameplate/spring.png', grade: AssetGrade.C, priceCoins: 350, durationDays: 7, isPermanent: false, sortOrder: 10 },
  ];

  let created = 0;
  for (const item of items) {
    const existing = await prisma.shopItem.findFirst({ where: { title: item.title, category: item.category } });
    if (!existing) {
      await prisma.shopItem.create({
        data: {
          ...item,
          imageUrl: item.imageUrl ?? '',
          priceDiamonds: 0,
          vipRequired: item.vipRequired ?? 0,
          levelRequired: 0,
          isActive: true,
        },
      });
      created++;
    }
  }

  console.log(`  Seeded ${created} shop items (${items.length} total defined).`);
}

async function seedRoomThemes() {
  console.log('Seeding room themes...');
  // Room themes are already in shop items as ROOM_THEME category
  // Also create dedicated RoomTheme models for the room-themes module

  const themes = [
    { name: 'Kech Ko\'k', imageUrl: 'https://cdn.voxo.app/themes/night-blue.jpg', grade: AssetGrade.C, priceCoins: 500, durationDays: 30, isPermanent: false, sortOrder: 1 },
    { name: 'Bahor Bog\'i', imageUrl: 'https://cdn.voxo.app/themes/spring-garden.jpg', grade: AssetGrade.B, priceCoins: 1200, durationDays: 30, isPermanent: false, sortOrder: 2 },
    { name: 'Galaktika', imageUrl: 'https://cdn.voxo.app/themes/galaxy.jpg', grade: AssetGrade.A, priceCoins: 3000, durationDays: 30, isPermanent: false, sortOrder: 3 },
    { name: 'Qirol Saroyi', imageUrl: 'https://cdn.voxo.app/themes/royal-palace.jpg', grade: AssetGrade.S, priceCoins: 10000, isPermanent: true, sortOrder: 4 },
    { name: 'Olmos Qal\'asi', imageUrl: 'https://cdn.voxo.app/themes/diamond-castle.jpg', grade: AssetGrade.SS, priceCoins: 50000, isPermanent: true, sortOrder: 5 },
    { name: 'Dengiz Tubida', imageUrl: 'https://cdn.voxo.app/themes/underwater.jpg', grade: AssetGrade.A, priceCoins: 2500, durationDays: 30, isPermanent: false, sortOrder: 6 },
    { name: 'Neon Shahar', imageUrl: 'https://cdn.voxo.app/themes/neon-city.jpg', grade: AssetGrade.A, priceCoins: 3500, durationDays: 30, isPermanent: false, sortOrder: 7 },
    { name: 'Yoqimli Qish', imageUrl: 'https://cdn.voxo.app/themes/cozy-winter.jpg', grade: AssetGrade.B, priceCoins: 1500, durationDays: 30, isPermanent: false, sortOrder: 8 },
    { name: 'Yashil O\'rmon', imageUrl: 'https://cdn.voxo.app/themes/forest.jpg', grade: AssetGrade.C, priceCoins: 700, durationDays: 30, isPermanent: false, sortOrder: 9 },
    { name: 'Quyosh Botishi', imageUrl: 'https://cdn.voxo.app/themes/sunset.jpg', grade: AssetGrade.B, priceCoins: 1800, durationDays: 30, isPermanent: false, sortOrder: 10 },
    { name: 'Dragon Eri', imageUrl: 'https://cdn.voxo.app/themes/dragon-lair.jpg', grade: AssetGrade.SS, priceCoins: 80000, isPermanent: true, sortOrder: 11 },
    { name: 'Futuristik', imageUrl: 'https://cdn.voxo.app/themes/futuristic.jpg', grade: AssetGrade.S, priceCoins: 15000, isPermanent: true, sortOrder: 12 },
    { name: 'Japoniya Bog\'i', imageUrl: 'https://cdn.voxo.app/themes/japan-garden.jpg', grade: AssetGrade.A, priceCoins: 4000, durationDays: 30, isPermanent: false, sortOrder: 13 },
    { name: 'Romantik Gul', imageUrl: 'https://cdn.voxo.app/themes/romantic-rose.jpg', grade: AssetGrade.B, priceCoins: 2000, durationDays: 30, isPermanent: false, sortOrder: 14 },
    { name: 'Koinot Maydoni', imageUrl: 'https://cdn.voxo.app/themes/cosmic-arena.jpg', grade: AssetGrade.SS, priceCoins: 120000, isPermanent: true, sortOrder: 15 },
  ];

  let created = 0;
  for (const theme of themes) {
    const existing = await prisma.roomTheme.findFirst({ where: { name: theme.name } });
    if (!existing) {
      await prisma.roomTheme.create({
        data: { ...theme, priceDiamonds: 0, isActive: true },
      });
      created++;
    }
  }

  console.log(`  Seeded ${created} room themes.`);
}

async function seedNameplates() {
  console.log('Seeding nameplates...');

  const nameplates = [
    { name: 'Oddiy Ism', imageUrl: 'https://cdn.voxo.app/nameplate/plain.png', grade: AssetGrade.C, priceCoins: 100, isPermanent: true, sortOrder: 1 },
    { name: 'Ko\'k Ism', imageUrl: 'https://cdn.voxo.app/nameplate/blue.png', grade: AssetGrade.C, priceCoins: 200, durationDays: 30, isPermanent: false, sortOrder: 2 },
    { name: 'Oltin Ism', imageUrl: 'https://cdn.voxo.app/nameplate/gold.png', grade: AssetGrade.B, priceCoins: 500, durationDays: 30, isPermanent: false, sortOrder: 3 },
    { name: 'Neon Ism', imageUrl: 'https://cdn.voxo.app/nameplate/neon.png', grade: AssetGrade.A, priceCoins: 1500, durationDays: 30, isPermanent: false, sortOrder: 4 },
    { name: 'Qirol Ismi', imageUrl: 'https://cdn.voxo.app/nameplate/royal.png', grade: AssetGrade.S, priceCoins: 5000, isPermanent: true, sortOrder: 5 },
    { name: 'Kristal Ism', imageUrl: 'https://cdn.voxo.app/nameplate/crystal.png', grade: AssetGrade.SS, priceCoins: 25000, isPermanent: true, sortOrder: 6 },
    { name: 'Rainbow Ism', imageUrl: 'https://cdn.voxo.app/nameplate/rainbow.png', grade: AssetGrade.A, priceCoins: 2000, durationDays: 30, isPermanent: false, sortOrder: 7 },
    { name: 'Dragon Ismi', imageUrl: 'https://cdn.voxo.app/nameplate/dragon.png', grade: AssetGrade.SS, priceCoins: 50000, isPermanent: true, sortOrder: 8 },
    { name: 'Galaktika Ismi', imageUrl: 'https://cdn.voxo.app/nameplate/galaxy.png', grade: AssetGrade.S, priceCoins: 8000, isPermanent: true, sortOrder: 9 },
    { name: 'Bahor Ismi', imageUrl: 'https://cdn.voxo.app/nameplate/spring.png', grade: AssetGrade.C, priceCoins: 350, durationDays: 7, isPermanent: false, sortOrder: 10 },
  ];

  let created = 0;
  for (const np of nameplates) {
    const existing = await prisma.nameplate.findFirst({ where: { name: np.name } });
    if (!existing) {
      await prisma.nameplate.create({
        data: { ...np, priceDiamonds: 0, levelRequired: 0, isActive: true },
      });
      created++;
    }
  }

  console.log(`  Seeded ${created} nameplates.`);
}

async function main() {
  console.log('Starting VOXO database seed...\n');

  // Seed users
  const { admin, moderator, testUsers } = await seedUsers(
    await bcrypt.hash(HASHED_PASSWORD_PLACEHOLDER, 10),
  );

  // Seed wallets
  await seedWallets(admin, moderator, testUsers);

  // Seed VIP plans
  await seedVipPlans();

  // Seed gifts
  await seedGifts();

  // Seed lucky gift configs (depends on gifts)
  await seedLuckyGiftConfigs();

  // Seed entrance effects
  await seedEntranceEffects();

  // Seed vehicles
  await seedVehicles();

  // Seed daily rewards
  await seedDailyRewards(testUsers);

  // Seed events
  await seedEvents();

  // Seed banners
  await seedBanners();

  // Seed recharge products
  await seedRechargeProducts();

  // Seed rooms (admin as host)
  await seedRooms(admin.id);

  // Stage 4 seeds
  await seedNoblePlans();
  await seedPrestigeLevelRules();
  await seedMedals();
  await seedShopItems();
  await seedRoomThemes();
  await seedNameplates();

  console.log('\nVOXO seed completed successfully!');
  console.log('-----------------------------------');
  console.log('Admin phone:     +998900000001');
  console.log('Moderator phone: +998900000002');
  console.log('Test users:      +998901234561 through +998901234570');
  console.log('Password:        Password123!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
