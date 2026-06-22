import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { getSession } from 'next-auth/react'
import {
  User,
  Room,
  Gift,
  GiftTransaction,
  WalletTransaction,
  Withdrawal,
  Family,
  Agency,
  Report,
  PushNotification,
  Banner,
  Event,
  EventParticipant,
  VIPPlan,
  AppSettings,
  CoinPackage,
  DashboardStats,
  RevenueDataPoint,
  UserGrowthDataPoint,
  PaginatedResponse,
  QueryParams,
  UserBan,
  RoomMember,
} from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.client.interceptors.request.use(async (config) => {
      const session = await getSession() as any
      if (session?.accessToken) {
        config.headers.Authorization = `Bearer ${session.accessToken}`
      }
      return config
    })

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error.response?.status
        if (status === 401) {
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
        }
        const serverMsg = error.response?.data?.message
        if (serverMsg) {
          error.message = Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg
        } else if (status === 403) {
          error.message = 'You do not have permission to perform this action'
        } else if (status === 404) {
          error.message = 'The requested resource was not found'
        } else if (status === 429) {
          error.message = 'Too many requests. Please try again later'
        } else if (status && status >= 500) {
          error.message = 'Server error. Please try again later'
        }
        return Promise.reject(error)
      }
    )
  }

  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client(config)
    return response.data
  }

  // ============ DASHBOARD ============
  async getDashboardStats(): Promise<DashboardStats> {
    return this.request({ url: '/admin/dashboard/stats', method: 'GET' })
  }

  async getRevenueChart(days: number = 30): Promise<RevenueDataPoint[]> {
    return this.request({ url: `/admin/dashboard/revenue?days=${days}`, method: 'GET' })
  }

  async getUserGrowthChart(days: number = 7): Promise<UserGrowthDataPoint[]> {
    return this.request({ url: `/admin/dashboard/user-growth?days=${days}`, method: 'GET' })
  }

  async getTopRooms(limit: number = 10): Promise<Room[]> {
    return this.request({ url: `/admin/dashboard/top-rooms?limit=${limit}`, method: 'GET' })
  }

  async getRecentTransactions(limit: number = 20): Promise<WalletTransaction[]> {
    return this.request({ url: `/admin/dashboard/recent-transactions?limit=${limit}`, method: 'GET' })
  }

  // ============ REVENUE (dedicated endpoints) ============
  async getRevenueSummary(params?: { startDate?: string; endDate?: string }) {
    return this.request({ url: '/admin/revenue/summary', method: 'GET', params })
  }

  async getTopRechargedUsers(limit: number = 10) {
    return this.request({ url: `/admin/revenue/top-users?limit=${limit}`, method: 'GET' })
  }

  // ============ USERS ============
  async getUsers(params: QueryParams): Promise<PaginatedResponse<User>> {
    return this.request({ url: '/admin/users', method: 'GET', params })
  }

  async getUser(id: string): Promise<User> {
    return this.request({ url: `/admin/users/${id}`, method: 'GET' })
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    return this.request({ url: `/admin/users/${id}`, method: 'PUT', data })
  }

  async deleteUser(id: string): Promise<void> {
    return this.request({ url: `/admin/users/${id}`, method: 'DELETE' })
  }

  async banUser(id: string, data: { reason: string; duration?: number }): Promise<UserBan> {
    return this.request({ url: `/admin/users/${id}/ban`, method: 'POST', data })
  }

  async unbanUser(id: string): Promise<void> {
    return this.request({ url: `/admin/users/${id}/unban`, method: 'POST' })
  }

  async getUserBans(id: string): Promise<UserBan[]> {
    return this.request({ url: `/admin/users/${id}/bans`, method: 'GET' })
  }

  async getUserTransactions(id: string, params?: QueryParams): Promise<PaginatedResponse<WalletTransaction>> {
    return this.request({ url: `/admin/users/${id}/transactions`, method: 'GET', params })
  }

  async getUserRooms(id: string, params?: QueryParams): Promise<PaginatedResponse<Room>> {
    return this.request({ url: `/admin/users/${id}/rooms`, method: 'GET', params })
  }

  async adjustUserWallet(id: string, data: { coins?: number; diamonds?: number; reason: string }): Promise<User> {
    return this.request({ url: `/admin/users/${id}/wallet/adjust`, method: 'POST', data })
  }

  async exportUsers(params: QueryParams): Promise<Blob> {
    return this.request({
      url: '/admin/users/export',
      method: 'GET',
      params,
      responseType: 'blob',
    })
  }

  // ============ ROOMS ============
  async getRooms(params: QueryParams): Promise<PaginatedResponse<Room>> {
    return this.request({ url: '/admin/rooms', method: 'GET', params })
  }

  async getRoom(id: string): Promise<Room> {
    return this.request({ url: `/admin/rooms/${id}`, method: 'GET' })
  }

  async closeRoom(id: string, reason?: string): Promise<void> {
    return this.request({ url: `/admin/rooms/${id}/close`, method: 'POST', data: { reason } })
  }

  async banRoom(id: string, reason: string): Promise<void> {
    return this.request({ url: `/admin/rooms/${id}/ban`, method: 'POST', data: { reason } })
  }

  async getRoomMembers(id: string): Promise<RoomMember[]> {
    return this.request({ url: `/admin/rooms/${id}/members`, method: 'GET' })
  }

  async getRoomGiftHistory(id: string, params?: QueryParams): Promise<PaginatedResponse<GiftTransaction>> {
    return this.request({ url: `/admin/rooms/${id}/gifts`, method: 'GET', params })
  }

  // ============ GIFTS ============
  async getGifts(params?: QueryParams): Promise<PaginatedResponse<Gift>> {
    return this.request({ url: '/admin/gifts', method: 'GET', params })
  }

  async getGift(id: string): Promise<Gift> {
    return this.request({ url: `/admin/gifts/${id}`, method: 'GET' })
  }

  async createGift(data: FormData): Promise<Gift> {
    return this.request({
      url: '/admin/gifts',
      method: 'POST',
      data,
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  async updateGift(id: string, data: FormData | Partial<Gift>): Promise<Gift> {
    const isFormData = data instanceof FormData
    return this.request({
      url: `/admin/gifts/${id}`,
      method: 'PUT',
      data,
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
    })
  }

  async deleteGift(id: string): Promise<void> {
    return this.request({ url: `/admin/gifts/${id}`, method: 'DELETE' })
  }

  async toggleGift(id: string, isActive: boolean): Promise<Gift> {
    return this.request({ url: `/admin/gifts/${id}/toggle`, method: 'PUT', data: { isActive } })
  }

  async getGiftTransactions(params?: QueryParams): Promise<PaginatedResponse<GiftTransaction>> {
    return this.request({ url: '/admin/gifts/transactions', method: 'GET', params })
  }

  // ============ WALLETS ============
  async getWalletStats(): Promise<{
    totalCoins: number
    totalDiamonds: number
    todayRecharge: number
    weekRecharge: number
    monthRecharge: number
  }> {
    return this.request({ url: '/admin/wallets/stats', method: 'GET' })
  }

  async getTransactions(params?: QueryParams): Promise<PaginatedResponse<WalletTransaction>> {
    return this.request({ url: '/admin/wallets/transactions', method: 'GET', params })
  }

  async getTransaction(id: string): Promise<WalletTransaction> {
    return this.request({ url: `/admin/wallets/transactions/${id}`, method: 'GET' })
  }

  // ============ WITHDRAWALS ============
  async getWithdrawals(params?: QueryParams): Promise<PaginatedResponse<Withdrawal>> {
    return this.request({ url: '/admin/withdrawals', method: 'GET', params })
  }

  async approveWithdrawal(id: string, note?: string): Promise<Withdrawal> {
    return this.request({ url: `/admin/withdrawals/${id}/approve`, method: 'POST', data: { note } })
  }

  async rejectWithdrawal(id: string, reason: string): Promise<Withdrawal> {
    return this.request({ url: `/admin/withdrawals/${id}/reject`, method: 'POST', data: { reason } })
  }

  async bulkProcessWithdrawals(ids: string[], action: 'approve' | 'reject', reason?: string): Promise<void> {
    return this.request({ url: '/admin/withdrawals/bulk', method: 'POST', data: { ids, action, reason } })
  }

  async exportWithdrawals(params?: QueryParams): Promise<Blob> {
    return this.request({ url: '/admin/withdrawals/export', method: 'GET', params, responseType: 'blob' })
  }

  // ============ VIP ============
  async getVIPPlans(): Promise<VIPPlan[]> {
    return this.request({ url: '/admin/vip/plans', method: 'GET' })
  }

  async updateVIPPlan(id: string, data: Partial<VIPPlan>): Promise<VIPPlan> {
    return this.request({ url: `/admin/vip/plans/${id}`, method: 'PUT', data })
  }

  // ============ FAMILIES ============
  async getFamilies(params?: QueryParams): Promise<PaginatedResponse<Family>> {
    return this.request({ url: '/admin/families', method: 'GET', params })
  }

  async getFamily(id: string): Promise<Family> {
    return this.request({ url: `/admin/families/${id}`, method: 'GET' })
  }

  async banFamily(id: string, reason: string): Promise<void> {
    return this.request({ url: `/admin/families/${id}/ban`, method: 'POST', data: { reason } })
  }

  async unbanFamily(id: string): Promise<void> {
    return this.request({ url: `/admin/families/${id}/unban`, method: 'POST' })
  }

  // ============ COUPLES ============
  async getCouples(params?: QueryParams): Promise<PaginatedResponse<any>> {
    return this.request({ url: '/admin/couples', method: 'GET', params })
  }

  async getCouple(id: string): Promise<any> {
    return this.request({ url: `/admin/couples/${id}`, method: 'GET' })
  }

  async endCouple(id: string, reason: string): Promise<void> {
    return this.request({ url: `/admin/couples/${id}/end`, method: 'POST', data: { reason } })
  }

  // ============ AGENCIES ============
  async getAgencies(params?: QueryParams): Promise<PaginatedResponse<Agency>> {
    return this.request({ url: '/admin/agencies', method: 'GET', params })
  }

  async getAgency(id: string): Promise<Agency> {
    return this.request({ url: `/admin/agencies/${id}`, method: 'GET' })
  }

  async approveAgency(id: string): Promise<Agency> {
    return this.request({ url: `/admin/agencies/${id}/approve`, method: 'POST' })
  }

  async rejectAgency(id: string, reason: string): Promise<Agency> {
    return this.request({ url: `/admin/agencies/${id}/reject`, method: 'POST', data: { reason } })
  }

  // ============ REPORTS ============
  async getReports(params?: QueryParams): Promise<PaginatedResponse<Report>> {
    return this.request({ url: '/admin/reports', method: 'GET', params })
  }

  async getReport(id: string): Promise<Report> {
    return this.request({ url: `/admin/reports/${id}`, method: 'GET' })
  }

  async resolveReport(id: string, data: { action: string; adminNote: string }): Promise<Report> {
    return this.request({ url: `/admin/reports/${id}/resolve`, method: 'POST', data })
  }

  async dismissReport(id: string, note: string): Promise<Report> {
    return this.request({ url: `/admin/reports/${id}/dismiss`, method: 'POST', data: { note } })
  }

  // ============ NOTIFICATIONS ============
  async getNotifications(params?: QueryParams): Promise<PaginatedResponse<PushNotification>> {
    return this.request({ url: '/admin/notifications', method: 'GET', params })
  }

  async sendNotification(data: Partial<PushNotification>): Promise<PushNotification> {
    return this.request({ url: '/admin/notifications/send', method: 'POST', data })
  }

  async scheduleNotification(data: Partial<PushNotification>): Promise<PushNotification> {
    return this.request({ url: '/admin/notifications/schedule', method: 'POST', data })
  }

  async cancelNotification(id: string): Promise<void> {
    return this.request({ url: `/admin/notifications/${id}/cancel`, method: 'POST' })
  }

  // ============ BANNERS ============
  async getBanners(params?: QueryParams): Promise<PaginatedResponse<Banner>> {
    return this.request({ url: '/admin/banners', method: 'GET', params })
  }

  async createBanner(data: FormData): Promise<Banner> {
    return this.request({
      url: '/admin/banners',
      method: 'POST',
      data,
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  async updateBanner(id: string, data: FormData | Partial<Banner>): Promise<Banner> {
    const isFormData = data instanceof FormData
    return this.request({
      url: `/admin/banners/${id}`,
      method: 'PUT',
      data,
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
    })
  }

  async deleteBanner(id: string): Promise<void> {
    return this.request({ url: `/admin/banners/${id}`, method: 'DELETE' })
  }

  async reorderBanners(ids: string[]): Promise<void> {
    return this.request({ url: '/admin/banners/reorder', method: 'PUT', data: { ids } })
  }

  // ============ EVENTS ============
  async getEvents(params?: QueryParams): Promise<PaginatedResponse<Event>> {
    return this.request({ url: '/admin/events', method: 'GET', params })
  }

  async getEvent(id: string): Promise<Event> {
    return this.request({ url: `/admin/events/${id}`, method: 'GET' })
  }

  async createEvent(data: FormData): Promise<Event> {
    return this.request({
      url: '/admin/events',
      method: 'POST',
      data,
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  async updateEvent(id: string, data: FormData | Partial<Event>): Promise<Event> {
    const isFormData = data instanceof FormData
    return this.request({
      url: `/admin/events/${id}`,
      method: 'PUT',
      data,
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
    })
  }

  async getEventParticipants(id: string, params?: QueryParams): Promise<PaginatedResponse<EventParticipant>> {
    return this.request({ url: `/admin/events/${id}/participants`, method: 'GET', params })
  }

  async getEventLeaderboard(id: string): Promise<EventParticipant[]> {
    return this.request({ url: `/admin/events/${id}/leaderboard`, method: 'GET' })
  }

  // ============ SETTINGS ============
  async getSettings(): Promise<AppSettings> {
    return this.request({ url: '/admin/settings', method: 'GET' })
  }

  async updateSettings(data: Partial<AppSettings>): Promise<AppSettings> {
    return this.request({ url: '/admin/settings', method: 'PUT', data })
  }

  async getCoinPackages(): Promise<CoinPackage[]> {
    return this.request({ url: '/admin/settings/coin-packages', method: 'GET' })
  }

  async updateCoinPackage(id: string, data: Partial<CoinPackage>): Promise<CoinPackage> {
    return this.request({ url: `/admin/settings/coin-packages/${id}`, method: 'PUT', data })
  }

  async createCoinPackage(data: Omit<CoinPackage, 'id'>): Promise<CoinPackage> {
    return this.request({ url: '/admin/settings/coin-packages', method: 'POST', data })
  }

  async deleteCoinPackage(id: string): Promise<void> {
    return this.request({ url: `/admin/settings/coin-packages/${id}`, method: 'DELETE' })
  }

  // ============ VIP (real API) ============
  async getVipPlans(): Promise<any[]> {
    return this.request({ url: '/vip/packages', method: 'GET' })
  }

  async updateVipPlan(id: string, data: Record<string, any>): Promise<any> {
    return this.request({ url: `/admin/vip/plans/${id}`, method: 'PATCH', data })
  }

  // ============ NOBLE ============
  async getNoblePlans(): Promise<any[]> {
    return this.request({ url: '/admin/noble/plans', method: 'GET' })
  }

  async createNoblePlan(data: Record<string, any>): Promise<any> {
    return this.request({ url: '/admin/noble/plans', method: 'POST', data })
  }

  async updateNoblePlan(id: string, data: Record<string, any>): Promise<any> {
    return this.request({ url: `/admin/noble/plans/${id}`, method: 'PATCH', data })
  }

  async deleteNoblePlan(id: string): Promise<void> {
    return this.request({ url: `/admin/noble/plans/${id}`, method: 'DELETE' })
  }

  // ============ SHOP ============
  async getShopItems(params?: { category?: string; page?: number; limit?: number }): Promise<any> {
    return this.request({ url: '/admin/shop/items', method: 'GET', params })
  }

  async createShopItem(data: Record<string, any>): Promise<any> {
    return this.request({ url: '/admin/shop/items', method: 'POST', data })
  }

  async updateShopItem(id: string, data: Record<string, any>): Promise<any> {
    return this.request({ url: `/admin/shop/items/${id}`, method: 'PATCH', data })
  }

  async deleteShopItem(id: string): Promise<void> {
    return this.request({ url: `/admin/shop/items/${id}`, method: 'DELETE' })
  }

  // ============ MEDALS ============
  async getMedals(params?: { category?: string; limit?: number }): Promise<any> {
    return this.request({ url: '/admin/medals', method: 'GET', params })
  }
  async createMedal(data: Record<string, any>): Promise<any> {
    return this.request({ url: '/admin/medals', method: 'POST', data })
  }
  async updateMedal(id: string, data: Record<string, any>): Promise<any> {
    return this.request({ url: `/admin/medals/${id}`, method: 'PATCH', data })
  }
  async deleteMedal(id: string): Promise<void> {
    return this.request({ url: `/admin/medals/${id}`, method: 'DELETE' })
  }

  // ============ ROOM THEMES ============
  async getRoomThemes(): Promise<any[]> {
    return this.request({ url: '/admin/room-themes', method: 'GET' })
  }
  async createRoomTheme(data: Record<string, any>): Promise<any> {
    return this.request({ url: '/admin/room-themes', method: 'POST', data })
  }
  async updateRoomTheme(id: string, data: Record<string, any>): Promise<any> {
    return this.request({ url: `/admin/room-themes/${id}`, method: 'PATCH', data })
  }
  async deleteRoomTheme(id: string): Promise<void> {
    return this.request({ url: `/admin/room-themes/${id}`, method: 'DELETE' })
  }

  // ============ NAMEPLATES ============
  async getNameplates(): Promise<any[]> {
    return this.request({ url: '/admin/nameplates', method: 'GET' })
  }
  async createNameplate(data: Record<string, any>): Promise<any> {
    return this.request({ url: '/admin/nameplates', method: 'POST', data })
  }
  async updateNameplate(id: string, data: Record<string, any>): Promise<any> {
    return this.request({ url: `/admin/nameplates/${id}`, method: 'PATCH', data })
  }
  async deleteNameplate(id: string): Promise<void> {
    return this.request({ url: `/admin/nameplates/${id}`, method: 'DELETE' })
  }

  // ============ DISCOVER ============
  async getDiscoverPosts(params?: { status?: string; page?: number; limit?: number }): Promise<any> {
    return this.request({ url: '/admin/discover/posts', method: 'GET', params })
  }

  async approveDiscoverPost(id: string): Promise<any> {
    return this.request({ url: `/admin/discover/posts/${id}/approve`, method: 'POST', data: {} })
  }

  async rejectDiscoverPost(id: string, reason?: string): Promise<any> {
    return this.request({ url: `/admin/discover/posts/${id}/reject`, method: 'POST', data: { reason } })
  }

  async getDiscoverReports(params?: { resolved?: boolean; page?: number }): Promise<any> {
    return this.request({ url: '/admin/discover/reports', method: 'GET', params })
  }

  async resolveDiscoverReport(id: string): Promise<any> {
    return this.request({ url: `/admin/discover/reports/${id}/resolve`, method: 'POST', data: {} })
  }

  // ============ REFERRALS ============
  async getAdminReferrals(params?: { page?: number; limit?: number }): Promise<any> {
    return this.request({ url: '/admin/referrals', method: 'GET', params })
  }

  async getReferralRules(): Promise<any> {
    return this.request({ url: '/admin/referrals/rules', method: 'GET' })
  }

  async createReferralRule(data: { level: number; rebatePercent: number; minRechargeUSD?: number; isActive?: boolean }): Promise<any> {
    return this.request({ url: '/admin/referrals/rules', method: 'POST', data })
  }

  async updateReferralRule(id: string, data: { rebatePercent?: number; isActive?: boolean }): Promise<any> {
    return this.request({ url: `/admin/referrals/rules/${id}`, method: 'PATCH', data })
  }

  // ============ SUPPORT / POLICIES ============
  async adminGetPolicies(): Promise<any> {
    return this.request({ url: '/support/admin/policies', method: 'GET' })
  }

  async adminCreatePolicy(data: Record<string, any>): Promise<any> {
    return this.request({ url: '/support/admin/policies', method: 'POST', data })
  }

  async adminUpdatePolicy(id: string, data: Record<string, any>): Promise<any> {
    return this.request({ url: `/support/admin/policies/${id}`, method: 'PATCH', data })
  }

  async adminPublishPolicy(id: string): Promise<any> {
    return this.request({ url: `/support/admin/policies/${id}/publish`, method: 'POST', data: {} })
  }

  async adminUnpublishPolicy(id: string): Promise<any> {
    return this.request({ url: `/support/admin/policies/${id}/unpublish`, method: 'POST', data: {} })
  }

  async adminDeletePolicy(id: string): Promise<any> {
    return this.request({ url: `/support/admin/policies/${id}`, method: 'DELETE' })
  }

  // ============ SUPPORT TICKETS ============
  async adminGetTickets(params?: Record<string, any>): Promise<any> {
    return this.request({ url: '/support/admin/tickets', method: 'GET', params })
  }

  async adminUpdateTicket(id: string, data: Record<string, any>): Promise<any> {
    return this.request({ url: `/support/admin/tickets/${id}`, method: 'PATCH', data })
  }

  async adminReplyTicket(id: string, body: string): Promise<any> {
    return this.request({ url: `/support/admin/tickets/${id}/reply`, method: 'POST', data: { body } })
  }

  // ============ SUPPORT LOGS ============
  async adminGetLogs(params?: Record<string, any>): Promise<any> {
    return this.request({ url: '/support/admin/logs', method: 'GET', params })
  }

  // ============ DELETION REQUESTS ============
  async adminGetDeletionRequests(params?: Record<string, any>): Promise<any> {
    return this.request({ url: '/support/admin/deletion-requests', method: 'GET', params })
  }

  // ============ NOTIFICATION CATEGORIES ============
  async getNotificationCategories(): Promise<any> {
    return this.request({ url: '/admin/notifications/categories', method: 'GET' })
  }

  async createNotificationCategory(data: { key: string; label: string; icon?: string; sortOrder?: number }): Promise<any> {
    return this.request({ url: '/admin/notifications/categories', method: 'POST', data })
  }

  async updateNotificationCategory(id: string, data: Record<string, any>): Promise<any> {
    return this.request({ url: `/admin/notifications/categories/${id}`, method: 'PATCH', data })
  }

  async deleteNotificationCategory(id: string): Promise<void> {
    return this.request({ url: `/admin/notifications/categories/${id}`, method: 'DELETE' })
  }

  // ============ GROWTH DASHBOARD ============
  async getGrowthSummary(from?: string, to?: string): Promise<any> {
    return this.request({ url: '/admin/growth/summary', method: 'GET', params: { from, to } })
  }

  async getGrowthRetention(): Promise<any> {
    return this.request({ url: '/admin/growth/retention', method: 'GET' })
  }

  async getGrowthRevenueChart(from?: string, to?: string, groupBy = 'day'): Promise<any> {
    return this.request({ url: '/admin/growth/revenue', method: 'GET', params: { from, to, groupBy } })
  }

  async getGrowthTopHosts(period = 'weekly', limit = 20): Promise<any> {
    return this.request({ url: '/admin/growth/hosts', method: 'GET', params: { period, limit } })
  }

  async getAdminRiskSummary(): Promise<any> {
    return this.request({ url: '/admin/risk/summary', method: 'GET' })
  }

  // ============ RISK ============
  async getRiskEvents(params?: Record<string, any>): Promise<any> {
    return this.request({ url: '/admin/risk/events', method: 'GET', params })
  }

  async getFlaggedUsers(params?: Record<string, any>): Promise<any> {
    return this.request({ url: '/admin/risk/users', method: 'GET', params })
  }

  async flagUser(id: string): Promise<any> {
    return this.request({ url: `/admin/risk/users/${id}/flag`, method: 'POST', data: {} })
  }

  async clearUser(id: string): Promise<any> {
    return this.request({ url: `/admin/risk/users/${id}/clear`, method: 'POST', data: {} })
  }

  async getRiskRules(): Promise<any> {
    return this.request({ url: '/admin/risk/rules', method: 'GET' })
  }

  async createRiskRule(data: Record<string, any>): Promise<any> {
    return this.request({ url: '/admin/risk/rules', method: 'POST', data })
  }

  async updateRiskRule(id: string, data: Record<string, any>): Promise<any> {
    return this.request({ url: `/admin/risk/rules/${id}`, method: 'PATCH', data })
  }

  async toggleRiskRule(id: string): Promise<any> {
    return this.request({ url: `/admin/risk/rules/${id}/toggle`, method: 'PATCH', data: {} })
  }

  // ============ MISSIONS ============
  async adminGetMissions(params?: Record<string, any>): Promise<any> {
    return this.request({ url: '/admin/missions', method: 'GET', params })
  }

  async adminCreateMission(data: Record<string, any>): Promise<any> {
    return this.request({ url: '/admin/missions', method: 'POST', data })
  }

  async adminUpdateMission(id: string, data: Record<string, any>): Promise<any> {
    return this.request({ url: `/admin/missions/${id}`, method: 'PATCH', data })
  }

  async adminToggleMission(id: string): Promise<any> {
    return this.request({ url: `/admin/missions/${id}/toggle`, method: 'PATCH', data: {} })
  }

  // ============ VERIFICATION ============
  async adminGetVerificationRequests(): Promise<any> {
    return this.request({ url: '/admin/verification/requests', method: 'GET' })
  }

  async adminVerifyUser(id: string, badgeType: string): Promise<any> {
    return this.request({ url: `/admin/users/${id}/verify`, method: 'POST', data: { badgeType } })
  }

  async adminUnverifyUser(id: string, badgeType: string): Promise<any> {
    return this.request({ url: `/admin/users/${id}/unverify`, method: 'POST', data: { badgeType } })
  }

  async adminVerifyAgency(id: string): Promise<any> {
    return this.request({ url: `/admin/agencies/${id}/verify`, method: 'POST', data: {} })
  }

  async getVerificationBadges(): Promise<any> {
    return this.request({ url: '/verification/badges', method: 'GET' })
  }

  // ============ HOST RANKINGS ============
  async getHostRanking(period = 'weekly', limit = 50): Promise<any> {
    return this.request({ url: '/host/ranking', method: 'GET', params: { period, limit } })
  }

  // ============ PAYOUTS ============
  async adminGetPayouts(params?: Record<string, any>): Promise<any> {
    return this.request({ url: '/admin/agency/payouts', method: 'GET', params })
  }

  async adminApprovePayout(id: string): Promise<any> {
    return this.request({ url: `/admin/agency/payouts/${id}/approve`, method: 'POST', data: {} })
  }

  async adminRejectPayout(id: string, reason?: string): Promise<any> {
    return this.request({ url: `/admin/agency/payouts/${id}/reject`, method: 'POST', data: { reason } })
  }
}

export const api = new ApiClient()
export default api
