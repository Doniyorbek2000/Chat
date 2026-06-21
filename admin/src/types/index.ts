// ============ AUTH TYPES ============
export interface AdminUser {
  id: string
  email: string
  name: string
  role: AdminRole
  avatar?: string
  lastLogin?: string
  createdAt: string
}

export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'support'

// ============ USER TYPES ============
export interface User {
  id: string
  uid: string
  username: string
  displayName: string
  email?: string
  phone?: string
  avatar?: string
  bio?: string
  gender?: 'male' | 'female' | 'other'
  birthday?: string
  country?: string
  level: number
  exp: number
  vipLevel: number
  vipExpiry?: string
  coins: number
  diamonds: number
  status: UserStatus
  isOnline: boolean
  lastSeen?: string
  createdAt: string
  updatedAt: string
  totalRecharged: number
  totalWithdrawn: number
  frameId?: string
  badgeId?: string
  followersCount: number
  followingCount: number
  familyId?: string
  agencyId?: string
  isMic?: boolean
  totalGiftsSent: number
  totalGiftsReceived: number
}

export type UserStatus = 'active' | 'banned' | 'suspended' | 'deleted'

export interface UserBan {
  id: string
  userId: string
  adminId: string
  reason: string
  duration?: number // in hours, null = permanent
  expiresAt?: string
  createdAt: string
  isActive: boolean
}

// ============ ROOM TYPES ============
export interface Room {
  id: string
  title: string
  coverImage?: string
  description?: string
  hostId: string
  host?: User
  type: RoomType
  category?: string
  maxSeats: number
  currentSeats: number
  totalViewers: number
  status: RoomStatus
  isLocked: boolean
  password?: string
  totalGiftsValue: number
  startedAt?: string
  endedAt?: string
  createdAt: string
  tags?: string[]
  region?: string
  onlineCount: number
  familyId?: string
  agencyId?: string
}

export type RoomType = 'public' | 'private' | 'family' | 'agency' | 'event'
export type RoomStatus = 'live' | 'ended' | 'paused' | 'banned'

export interface RoomMember {
  id: string
  roomId: string
  userId: string
  user?: User
  role: 'host' | 'co_host' | 'speaker' | 'audience'
  seatIndex?: number
  joinedAt: string
  leftAt?: string
  totalGiftsSent: number
}

// ============ GIFT TYPES ============
export interface Gift {
  id: string
  name: string
  category: GiftCategory
  type: GiftType
  imageUrl: string
  animationUrl?: string
  thumbnailUrl?: string
  priceDiamonds: number
  priceCoins?: number
  sortOrder: number
  isActive: boolean
  isSpecial: boolean
  totalUsage: number
  totalRevenue: number
  createdAt: string
  updatedAt: string
}

export type GiftCategory = 'basic' | 'premium' | 'special' | 'event' | 'seasonal'
export type GiftType = 'static' | 'lottie' | 'svga' | 'fullscreen'

export interface GiftTransaction {
  id: string
  giftId: string
  gift?: Gift
  senderId: string
  sender?: User
  receiverId: string
  receiver?: User
  roomId?: string
  room?: Room
  quantity: number
  totalDiamonds: number
  message?: string
  createdAt: string
}

// ============ WALLET TYPES ============
export interface WalletTransaction {
  id: string
  userId: string
  user?: User
  type: TransactionType
  amount: number
  currency: 'coins' | 'diamonds' | 'usd'
  description: string
  referenceId?: string
  referenceType?: string
  balanceBefore: number
  balanceAfter: number
  status: TransactionStatus
  metadata?: Record<string, unknown>
  createdAt: string
}

export type TransactionType =
  | 'recharge'
  | 'gift_sent'
  | 'gift_received'
  | 'withdrawal'
  | 'vip_purchase'
  | 'coins_purchase'
  | 'exchange'
  | 'bonus'
  | 'refund'
  | 'admin_adjustment'

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled'

// ============ WITHDRAWAL TYPES ============
export interface Withdrawal {
  id: string
  userId: string
  user?: User
  amount: number
  currency: string
  method: WithdrawalMethod
  accountInfo: Record<string, string>
  status: WithdrawalStatus
  adminId?: string
  adminNote?: string
  requestedAt: string
  processedAt?: string
  fee: number
  netAmount: number
}

export type WithdrawalMethod = 'bank_transfer' | 'paypal' | 'alipay' | 'wechat' | 'crypto'
export type WithdrawalStatus = 'pending' | 'processing' | 'approved' | 'rejected' | 'cancelled'

// ============ VIP TYPES ============
export interface VIPPlan {
  id: string
  level: number
  name: string
  priceMonthly: number
  priceYearly: number
  benefits: VIPBenefit[]
  badgeUrl?: string
  frameUrl?: string
  color: string
  isActive: boolean
}

export interface VIPBenefit {
  type: string
  value: string | number
  description: string
}

// ============ FAMILY TYPES ============
export interface Family {
  id: string
  name: string
  tag: string
  avatar?: string
  ownerId: string
  owner?: User
  level: number
  exp: number
  membersCount: number
  maxMembers: number
  totalGiftsReceived: number
  announcement?: string
  isPublic: boolean
  status: 'active' | 'banned'
  createdAt: string
  region?: string
}

// ============ AGENCY TYPES ============
export interface Agency {
  id: string
  name: string
  ownerId: string
  owner?: User
  talentsCount: number
  totalWithdrawn: number
  totalRevenue: number
  commissionRate: number
  status: 'active' | 'banned' | 'pending'
  createdAt: string
  region?: string
}

// ============ REPORT TYPES ============
export interface Report {
  id: string
  reporterId: string
  reporter?: User
  targetId: string
  targetType: 'user' | 'room' | 'message' | 'gift'
  targetUser?: User
  targetRoom?: Room
  reason: string
  description?: string
  evidence?: string[]
  status: ReportStatus
  adminId?: string
  adminNote?: string
  action?: ReportAction
  createdAt: string
  updatedAt: string
}

export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed'
export type ReportAction = 'warn' | 'ban_user' | 'ban_room' | 'delete_content' | 'no_action'

// ============ NOTIFICATION TYPES ============
export interface PushNotification {
  id: string
  title: string
  body: string
  type: NotificationType
  target: NotificationTarget
  targetValue?: string
  imageUrl?: string
  actionUrl?: string
  scheduledAt?: string
  sentAt?: string
  status: 'draft' | 'scheduled' | 'sent' | 'failed'
  sentCount?: number
  createdAt: string
}

export type NotificationType = 'general' | 'promotion' | 'system' | 'event' | 'warning'
export type NotificationTarget = 'all' | 'specific_user' | 'vip_users' | 'country' | 'level_range'

// ============ BANNER TYPES ============
export interface Banner {
  id: string
  title: string
  imageUrl: string
  linkUrl?: string
  position: BannerPosition
  sortOrder: number
  isActive: boolean
  startDate?: string
  endDate?: string
  clickCount: number
  viewCount: number
  createdAt: string
}

export type BannerPosition = 'home_top' | 'home_middle' | 'discovery' | 'loading'

// ============ EVENT TYPES ============
export interface Event {
  id: string
  name: string
  description?: string
  coverImage?: string
  type: EventType
  status: EventStatus
  startDate: string
  endDate: string
  rules?: string
  prizes?: EventPrize[]
  participantsCount: number
  createdAt: string
}

export type EventType = 'ranking' | 'spending' | 'gifting' | 'room_activity' | 'custom'
export type EventStatus = 'draft' | 'active' | 'ended' | 'cancelled'

export interface EventPrize {
  rank: number
  reward: string
  value: number
}

export interface EventParticipant {
  id: string
  eventId: string
  userId: string
  user?: User
  score: number
  rank: number
  joinedAt: string
}

// ============ SETTINGS TYPES ============
export interface AppSettings {
  appName: string
  appVersion: string
  maintenanceMode: boolean
  maintenanceMessage?: string
  defaultCurrency: string
  coinExchangeRate: number
  diamondExchangeRate: number
  withdrawalMinAmount: number
  withdrawalMaxAmount: number
  withdrawalFeeRate: number
  giftCommissionRate: number
  agencyCommissionRate: number
  maxRoomSeats: number
  enableRegistration: boolean
  requirePhoneVerification: boolean
  enableGuestMode: boolean
  chatMessageMaxLength: number
  rateLimitRequests: number
  rateLimitWindow: number
}

export interface CoinPackage {
  id: string
  coins: number
  bonusCoins: number
  priceUSD: number
  isPopular: boolean
  isActive: boolean
}

// ============ DASHBOARD STATS ============
export interface DashboardStats {
  totalUsers: number
  usersChangePercent: number
  activeRooms: number
  roomsChangePercent: number
  todayRevenue: number
  revenueChangePercent: number
  activeVIPs: number
  vipChangePercent: number
  totalOnlineUsers: number
  newUsersToday: number
  pendingWithdrawals: number
  pendingReports: number
}

export interface RevenueDataPoint {
  date: string
  revenue: number
  transactions: number
}

export interface UserGrowthDataPoint {
  date: string
  newUsers: number
  totalUsers: number
}

// ============ COUPLES ============
export interface Couple {
  id: string
  user1Id: string
  user2Id: string
  user1: { id: string; uid: string; displayName: string; avatar?: string; level: number; isVip?: boolean }
  user2: { id: string; uid: string; displayName: string; avatar?: string; level: number; isVip?: boolean }
  level: number
  xp: number
  anniversaryDate?: string
  status: 'ACTIVE' | 'ENDED'
  endedAt?: string
  endedBy?: string
  endReason?: string
  createdAt: string
}

// ============ PAGINATION ============
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface QueryParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  [key: string]: unknown
}
