import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('support')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // User endpoints
  @Post('tickets')
  createTicket(@CurrentUser('id') userId: string, @Body() dto: any) {
    return this.supportService.createTicket(userId, dto);
  }

  @Get('tickets')
  getMyTickets(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.supportService.getMyTickets(userId, page, limit);
  }

  @Get('tickets/:id')
  getTicket(@CurrentUser('id') userId: string, @Param('id') ticketId: string) {
    return this.supportService.getTicketById(userId, ticketId);
  }

  @Post('tickets/:id/reply')
  addReply(@CurrentUser('id') userId: string, @Param('id') ticketId: string, @Body('body') body: string) {
    return this.supportService.addReply(userId, ticketId, body, false);
  }

  @Get('policies')
  getPolicies(@Query('language') language?: string) {
    return this.supportService.getPolicies(language);
  }

  @Get('policies/:slug')
  getPolicy(@Param('slug') slug: string, @Query('language') language = 'uz') {
    return this.supportService.getPolicyBySlug(slug, language);
  }

  // Admin endpoints
  @Get('admin/tickets')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.MODERATOR)
  adminGetTickets(
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.supportService.adminGetTickets({ status, page, limit });
  }

  @Patch('admin/tickets/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.MODERATOR)
  adminUpdateTicket(@Param('id') ticketId: string, @Body() dto: any) {
    return this.supportService.adminUpdateTicket(ticketId, dto);
  }

  @Post('admin/tickets/:id/reply')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.MODERATOR)
  adminReply(@CurrentUser('id') adminId: string, @Param('id') ticketId: string, @Body('body') body: string) {
    return this.supportService.addReply(adminId, ticketId, body, true);
  }

  @Get('admin/policies')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  adminGetPolicies() {
    return this.supportService.adminGetPolicies();
  }

  @Post('admin/policies')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  adminCreatePolicy(@Body() dto: any) {
    return this.supportService.adminCreatePolicy(dto);
  }

  @Patch('admin/policies/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  adminUpdatePolicy(@Param('id') id: string, @Body() dto: any) {
    return this.supportService.adminUpdatePolicy(id, dto);
  }

  @Post('admin/policies/:id/publish')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  adminPublishPolicy(@Param('id') id: string) {
    return this.supportService.adminPublishPolicy(id);
  }

  @Post('admin/policies/:id/unpublish')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  adminUnpublishPolicy(@Param('id') id: string) {
    return this.supportService.adminUnpublishPolicy(id);
  }

  @Delete('admin/policies/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  adminDeletePolicy(@Param('id') id: string) {
    return this.supportService.adminDeletePolicy(id);
  }

  @Get('admin/logs')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  adminGetLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.supportService.adminGetLogs(page, limit);
  }

  @Get('admin/deletion-requests')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  adminGetDeletionRequests(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.supportService.adminGetDeletionRequests(page, limit);
  }
}
