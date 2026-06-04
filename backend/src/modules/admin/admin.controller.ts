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

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==================== DASHBOARD ====================

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboardStats();
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
}
