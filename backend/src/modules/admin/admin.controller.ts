import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import {
  BanUserDto,
  CreateGiftDto,
  UpdateGiftDto,
  RejectWithdrawalDto,
  BroadcastDto,
  UpdateUserDto,
} from './dto/admin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DiscoverService } from '../discover/discover.service';
import { ReferralsService } from '../referrals/referrals.service';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly discoverService: DiscoverService,
    private readonly referralsService: ReferralsService,
    private readonly prisma: PrismaService,
  ) {}

  // ==================== DASHBOARD ====================

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('dashboard/stats')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('dashboard/top-rooms')
  getDashboardTopRooms() {
    return this.adminService.getDashboardTopRooms();
  }

  @Get('dashboard/recent-transactions')
  getDashboardRecentTransactions() {
    return this.adminService.getDashboardRecentTransactions();
  }

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  // ==================== USERS ====================

  @Get('users')
  getUsers(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('vipLevel') vipLevel?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.adminService.getUsers({
      search,
      status,
      vipLevel: vipLevel ? Number(vipLevel) : undefined,
      page,
      limit,
    });
  }

  @Get('users/:id')
  getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Put('users/:id')
  updateUser(
    @CurrentUser('id') adminId: string,
    @Param('id') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.adminService.updateUser(adminId, userId, dto);
  }

  @Post('users/:id/ban')
  banUser(
    @CurrentUser('id') adminId: string,
    @Param('id') userId: string,
    @Body() dto: BanUserDto,
  ) {
    return this.adminService.banUser(adminId, userId, dto);
  }

  @Delete('users/:id/ban')
  unbanUser(@CurrentUser('id') adminId: string, @Param('id') userId: string) {
    return this.adminService.unbanUser(adminId, userId);
  }

  @Post('users/:id/unban')
  unbanUserPost(@CurrentUser('id') adminId: string, @Param('id') userId: string) {
    return this.adminService.unbanUser(adminId, userId);
  }

  @Get('users/:id/bans')
  getUserBans(@Param('id') userId: string) {
    return this.adminService.getUserBans(userId);
  }

  @Get('users/:id/transactions')
  getUserTransactions(
    @Param('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.adminService.getUserTransactions(userId, page, limit);
  }

  @Post('users/:id/wallet/adjust')
  @Roles(Role.SUPER_ADMIN)
  adjustUserWallet(
    @CurrentUser('id') adminId: string,
    @Param('id') userId: string,
    @Body() dto: { currency: 'coins' | 'diamonds'; amount: number; reason: string },
  ) {
    return this.adminService.adjustUserWallet(adminId, userId, dto);
  }

  // ==================== ROOMS (ADMIN) ====================

  @Get('rooms')
  getRooms(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.adminService.getRooms({ search, status, type, page, limit });
  }

  @Get('rooms/:id')
  getRoomById(@Param('id') id: string) {
    return this.adminService.getRoomById(id);
  }

  @Get('rooms/:id/members')
  getRoomMembers(@Param('id') id: string) {
    return this.adminService.getRoomMembers(id);
  }

  @Post('rooms/:id/close')
  closeRoom(@CurrentUser('id') adminId: string, @Param('id') roomId: string) {
    return this.adminService.closeRoom(adminId, roomId);
  }

  // ==================== FAMILIES (ADMIN) ====================

  @Get('families')
  getFamilies(
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.adminService.getFamilies({ search, page, limit });
  }

  @Get('families/:id')
  getFamilyById(@Param('id') id: string) {
    return this.adminService.getFamilyById(id);
  }

  @Post('families/:id/ban')
  banFamily(
    @CurrentUser('id') adminId: string,
    @Param('id') familyId: string,
    @Body('reason') reason: string,
  ) {
    return this.adminService.banFamily(adminId, familyId, reason);
  }

  @Post('families/:id/unban')
  unbanFamily(@CurrentUser('id') adminId: string, @Param('id') familyId: string) {
    return this.adminService.unbanFamily(adminId, familyId);
  }

  // ==================== AGENCIES (ADMIN) ====================

  @Get('agencies')
  getAgencies(
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.adminService.getAgencies({ search, page, limit });
  }

  @Get('agencies/:id')
  getAgencyById(@Param('id') id: string) {
    return this.adminService.getAgencyById(id);
  }

  // ==================== REPORTS (ADMIN) ====================

  @Get('reports')
  getReports(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.adminService.getReports({ status, type, page, limit });
  }

  @Get('reports/:id')
  getReportById(@Param('id') id: string) {
    return this.adminService.getReportById(id);
  }

  @Post('reports/:id/resolve')
  resolveModReport(
    @CurrentUser('id') adminId: string,
    @Param('id') reportId: string,
    @Body() dto: { action?: string; adminNote?: string },
  ) {
    return this.adminService.resolveReport(adminId, reportId, dto);
  }

  @Post('reports/:id/dismiss')
  dismissReport(
    @CurrentUser('id') adminId: string,
    @Param('id') reportId: string,
    @Body() dto: { note?: string },
  ) {
    return this.adminService.dismissReport(adminId, reportId, dto);
  }

  // ==================== BANNERS (ADMIN) ====================

  @Get('banners')
  getBanners() {
    return this.adminService.getBanners();
  }

  @Post('banners')
  createBanner(@Body() data: any) {
    return this.adminService.createBanner(data);
  }

  @Put('banners/:id')
  updateBanner(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateBanner(id, data);
  }

  @Patch('banners/:id')
  patchBanner(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateBanner(id, data);
  }

  @Delete('banners/:id')
  deleteBanner(@Param('id') id: string) {
    return this.adminService.deleteBanner(id);
  }

  @Patch('banners/:id/toggle')
  toggleBanner(@Param('id') id: string) {
    return this.adminService.toggleBanner(id);
  }

  // ==================== EVENTS (ADMIN) ====================

  @Get('events')
  getEvents(
    @Query('isActive') isActive?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.adminService.getEvents({
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page,
      limit,
    });
  }

  @Get('events/:id')
  getEventById(@Param('id') id: string) {
    return this.adminService.getEventById(id);
  }

  @Post('events')
  createEvent(@Body() data: any) {
    return this.adminService.createEvent(data);
  }

  @Put('events/:id')
  updateEvent(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateEvent(id, data);
  }

  @Delete('events/:id')
  deleteEvent(@Param('id') id: string) {
    return this.adminService.deleteEvent(id);
  }

  // ==================== WALLET (ADMIN) ====================

  @Get('wallets/stats')
  getWalletStats() {
    return this.adminService.getWalletStats();
  }

  @Get('wallets/transactions')
  getWalletTransactions(
    @Query('type') type?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.adminService.getWalletTransactions({ type, page, limit });
  }

  // ==================== SETTINGS (ADMIN) ====================

  @Get('settings')
  getSettings() {
    return this.adminService.getSettings();
  }

  @Put('settings')
  updateSettings(@Body() data: any) {
    return this.adminService.updateSettings(data);
  }

  // ==================== WITHDRAWALS ====================

  @Get('withdrawals')
  getWithdrawals(
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.adminService.getWithdrawals(status, page, limit);
  }

  @Post('withdrawals/:id/approve')
  approveWithdrawal(
    @CurrentUser('id') adminId: string,
    @Param('id') withdrawalId: string,
  ) {
    return this.adminService.approveWithdrawal(adminId, withdrawalId);
  }

  @Post('withdrawals/:id/reject')
  rejectWithdrawal(
    @CurrentUser('id') adminId: string,
    @Param('id') withdrawalId: string,
    @Body() dto: RejectWithdrawalDto,
  ) {
    return this.adminService.rejectWithdrawal(adminId, withdrawalId, dto);
  }

  @Post('withdrawals/:id/mark-paid')
  markWithdrawalPaid(
    @CurrentUser('id') adminId: string,
    @Param('id') withdrawalId: string,
    @Body('txId') txId?: string,
  ) {
    return this.adminService.markWithdrawalPaid(adminId, withdrawalId, txId);
  }

  // ==================== GIFTS ====================

  @Get('gifts')
  getAllGifts() {
    return this.adminService.getAllGifts();
  }

  @Post('gifts')
  createGift(@Body() dto: CreateGiftDto) {
    return this.adminService.createGift(dto);
  }

  @Put('gifts/:id')
  updateGift(@Param('id') giftId: string, @Body() dto: UpdateGiftDto) {
    return this.adminService.updateGift(giftId, dto);
  }

  @Patch('gifts/:id/toggle')
  toggleGiftStatus(@Param('id') giftId: string) {
    return this.adminService.toggleGiftStatus(giftId);
  }

  // ==================== REVENUE ====================

  @Get('revenue/summary')
  getRevenueSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getRevenueSummary(startDate, endDate);
  }

  @Get('revenue/chart')
  getRevenueChart(
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'daily',
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days = 30,
  ) {
    return this.adminService.getRevenueChart(period, days);
  }

  @Get('revenue/top-users')
  getTopRechargedUsers(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.adminService.getTopRechargedUsers(limit);
  }

  // ==================== NOTIFICATIONS ====================

  @Post('notifications/broadcast')
  sendBroadcast(@Body() dto: BroadcastDto) {
    return this.adminService.sendBroadcastNotification(dto);
  }

  // ==================== AUDIT LOGS ====================

  @Get('audit-logs')
  getAuditLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.adminService.getAuditLogs(page, limit);
  }

  // ==================== NOBLE PLANS ====================

  @Get('noble/plans')
  getNoblePlans() {
    return this.adminService.getNoblePlans();
  }

  @Post('noble/plans')
  createNoblePlan(@Body() data: any) {
    return this.adminService.createNoblePlan(data);
  }

  @Patch('noble/plans/:id')
  updateNoblePlan(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateNoblePlan(id, data);
  }

  @Delete('noble/plans/:id')
  deleteNoblePlan(@Param('id') id: string) {
    return this.adminService.deleteNoblePlan(id);
  }

  // ==================== MEDALS (ADMIN) ====================

  @Get('medals')
  getMedalsAdmin(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
    @Query('category') category?: string,
  ) {
    return this.adminService.getMedalsAdmin({ page, limit, category });
  }

  @Post('medals')
  createMedal(@Body() data: any) {
    return this.adminService.createMedal(data);
  }

  @Patch('medals/:id')
  updateMedal(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateMedal(id, data);
  }

  @Delete('medals/:id')
  deleteMedal(@Param('id') id: string) {
    return this.adminService.deleteMedal(id);
  }

  // ==================== SHOP ITEMS (ADMIN) ====================

  @Get('shop/items')
  getShopItems(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
    @Query('category') category?: string,
  ) {
    return this.adminService.getShopItems({ page, limit, category });
  }

  @Post('shop/items')
  createShopItem(@Body() data: any) {
    return this.adminService.createShopItem(data);
  }

  @Patch('shop/items/:id')
  updateShopItem(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateShopItem(id, data);
  }

  @Delete('shop/items/:id')
  deleteShopItem(@Param('id') id: string) {
    return this.adminService.deleteShopItem(id);
  }

  // ==================== ROOM THEMES (ADMIN) ====================

  @Get('room-themes')
  getRoomThemesAdmin() {
    return this.adminService.getRoomThemesAdmin();
  }

  @Post('room-themes')
  createRoomTheme(@Body() data: any) {
    return this.adminService.createRoomTheme(data);
  }

  @Patch('room-themes/:id')
  updateRoomTheme(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateRoomTheme(id, data);
  }

  @Delete('room-themes/:id')
  deleteRoomTheme(@Param('id') id: string) {
    return this.adminService.deleteRoomTheme(id);
  }

  // ==================== NAMEPLATES (ADMIN) ====================

  @Get('nameplates')
  getNameplatesAdmin() {
    return this.adminService.getNameplatesAdmin();
  }

  @Post('nameplates')
  createNameplate(@Body() data: any) {
    return this.adminService.createNameplate(data);
  }

  @Patch('nameplates/:id')
  updateNameplate(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateNameplate(id, data);
  }

  @Delete('nameplates/:id')
  deleteNameplate(@Param('id') id: string) {
    return this.adminService.deleteNameplate(id);
  }

  // ==================== DISCOVER (ADMIN) ====================

  @Get('discover/posts')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.MODERATOR)
  adminDiscoverPosts(
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.discoverService.adminGetPosts({ status, page, limit });
  }

  @Post('discover/posts/:id/approve')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.MODERATOR)
  approvePost(@Param('id') id: string) {
    return this.discoverService.adminApprovePost(id);
  }

  @Post('discover/posts/:id/reject')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.MODERATOR)
  rejectPost(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.discoverService.adminRejectPost(id, body.reason);
  }

  @Get('discover/reports')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.MODERATOR)
  getDiscoverReports(
    @Query('resolved') resolved?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.discoverService.adminGetReports({
      resolved: resolved !== undefined ? resolved === 'true' : undefined,
      page,
      limit,
    });
  }

  @Post('discover/reports/:id/resolve')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.MODERATOR)
  resolveDiscoverReport(@Param('id') id: string) {
    return this.discoverService.adminResolveReport(id);
  }

  // ==================== REFERRALS (ADMIN) ====================

  @Get('referrals')
  adminGetReferrals(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.referralsService.adminGetReferrals(page, limit);
  }

  @Get('referrals/rules')
  getRebateRules() {
    return this.referralsService.adminGetRules();
  }

  @Post('referrals/rules')
  createRebateRule(@Body() dto: any) {
    return this.referralsService.adminCreateRule(dto);
  }

  @Patch('referrals/rules/:id')
  updateRebateRule(@Param('id') id: string, @Body() dto: any) {
    return this.referralsService.adminUpdateRule(id, dto);
  }

  // ==================== NOTIFICATION CATEGORIES (ADMIN) ====================

  @Get('notifications/categories')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.MODERATOR)
  getNotifCategories() {
    return this.prisma.notificationCategory.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  @Post('notifications/categories')
  createNotifCategory(@Body() body: { key: string; label: string; icon?: string; sortOrder?: number; isActive?: boolean }) {
    return this.prisma.notificationCategory.create({ data: body });
  }

  @Patch('notifications/categories/:id')
  updateNotifCategory(@Param('id') id: string, @Body() body: any) {
    return this.prisma.notificationCategory.update({ where: { id }, data: body });
  }

  @Delete('notifications/categories/:id')
  deleteNotifCategory(@Param('id') id: string) {
    return this.prisma.notificationCategory.delete({ where: { id } });
  }
}
