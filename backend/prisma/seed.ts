import { PrismaClient, UserRole, GiftCategory, GiftType, VehicleLevel, RoomType, EventType, LinkType, Currency, RechargeProductType } from '@prisma/client';
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
