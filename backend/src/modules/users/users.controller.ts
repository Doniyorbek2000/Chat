import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto, UpdateFcmTokenDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.usersService.findById(userId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Put('me/fcm-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register the device FCM token for push notifications' })
  async updateFcmToken(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateFcmTokenDto,
  ) {
    await this.usersService.updateFcmToken(userId, dto.fcmToken ?? null);
    return { updated: true };
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload avatar image' })
  async uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const url = await this.usersService.uploadAvatar(userId, file);
    return { url };
  }

  @Post('me/cover')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload cover image' })
  async uploadCover(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const url = await this.usersService.uploadCover(userId, file);
    return { url };
  }

  @Public()
  @Get('check-username')
  @ApiOperation({ summary: 'Check username availability' })
  @ApiQuery({ name: 'username', required: true })
  async checkUsername(@Query('username') username: string) {
    const taken = await this.usersService.isUsernameTaken(username);
    return { available: !taken };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search users' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async searchUsers(
    @Query('q') query: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.usersService.searchUsers(query, +page, +limit);
  }

  @Get('me/visitors')
  @ApiOperation({ summary: 'Get profile visitors' })
  async getVisitors(@CurrentUser('id') userId: string) {
    return this.usersService.getVisitors(userId);
  }

  @Get(':uid')
  @ApiOperation({ summary: 'Get user by UID' })
  async getUserByUid(
    @Param('uid') uid: string,
    @CurrentUser('id') visitorId: string,
  ) {
    const user = await this.usersService.findByUid(uid);
    await this.usersService.recordVisit(visitorId, user.id);
    return user;
  }

  @Post(':id/follow')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Follow a user' })
  async followUser(
    @CurrentUser('id') followerId: string,
    @Param('id') followingId: string,
  ) {
    return this.usersService.followUser(followerId, followingId);
  }

  @Delete(':id/follow')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unfollow a user' })
  async unfollowUser(
    @CurrentUser('id') followerId: string,
    @Param('id') followingId: string,
  ) {
    return this.usersService.unfollowUser(followerId, followingId);
  }

  @Get(':id/followers')
  @ApiOperation({ summary: 'Get user followers' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getFollowers(
    @Param('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.usersService.getFollowers(userId, +page, +limit);
  }

  @Get(':id/following')
  @ApiOperation({ summary: 'Get user following' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getFollowings(
    @Param('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.usersService.getFollowings(userId, +page, +limit);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get user statistics' })
  async getUserStats(@Param('id') userId: string) {
    return this.usersService.getUserStats(userId);
  }
}
