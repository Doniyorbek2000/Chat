import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { BadgeType } from '@prisma/client';

@Controller()
export class VerificationController {
  constructor(private readonly service: VerificationService) {}

  @Get('verification/badges')
  getBadges() {
    return this.service.getBadges();
  }

  @UseGuards(JwtAuthGuard)
  @Get('verification/me')
  getMyBadges(@Request() req) {
    return this.service.getUserBadges(req.user.id);
  }

  @Get('users/:id/verification')
  getUserVerification(@Param('id') id: string) {
    return this.service.getUserVerification(id);
  }

  // Admin
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get('admin/verification/requests')
  listRequests() {
    return this.service.listPendingRequests();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('admin/users/:id/verify')
  verifyUser(@Param('id') id: string, @Request() req, @Body() body: { badgeType: BadgeType }) {
    return this.service.verifyUser(id, body.badgeType, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('admin/users/:id/unverify')
  unverifyUser(@Param('id') id: string, @Request() req, @Body() body: { badgeType: BadgeType }) {
    return this.service.unverifyUser(id, body.badgeType, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('admin/agencies/:id/verify')
  verifyAgency(@Param('id') id: string, @Request() req) {
    return this.service.verifyAgency(id, req.user.id);
  }
}
