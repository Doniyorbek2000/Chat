import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DiscoverService } from './discover.service';
import { CreatePostDto, CreateCommentDto, ReportPostDto, UpdatePostDto } from './dto/discover.dto';

@ApiTags('Discover')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('discover')
export class DiscoverController {
  constructor(private readonly svc: DiscoverService) {}

  @Get('posts')
  getPosts(
    @CurrentUser('id') userId: string,
    @Query('country') country?: string,
    @Query('following') following?: string,
    @Query('trend') trend?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.svc.getPosts(userId, {
      country,
      following: following === 'true',
      trend: trend === 'true',
      page,
      limit: Math.min(limit, 50),
    });
  }

  @Get('posts/:id')
  getPost(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.svc.getPostById(userId, id);
  }

  @Post('posts')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  createPost(@CurrentUser('id') userId: string, @Body() dto: CreatePostDto) {
    return this.svc.createPost(userId, dto);
  }

  @Patch('posts/:id')
  updatePost(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.svc.updatePost(userId, id, dto);
  }

  @Delete('posts/:id')
  deletePost(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.svc.deletePost(userId, id);
  }

  @Post('posts/:id/like')
  likePost(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.svc.likePost(userId, id);
  }

  @Delete('posts/:id/like')
  unlikePost(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.svc.unlikePost(userId, id);
  }

  @Get('posts/:id/comments')
  getComments(
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.svc.getComments(id, page, limit);
  }

  @Post('posts/:id/comments')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  addComment(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.svc.addComment(userId, id, dto);
  }

  @Delete('posts/:id/comments/:commentId')
  deleteComment(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.svc.deleteComment(userId, postId, commentId);
  }

  @Post('posts/:id/gift')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  giftPost(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
    @Body() body: { giftId: string; amount?: number },
  ) {
    return this.svc.giftPost(userId, postId, body.giftId, body.amount);
  }

  @Post('posts/:id/report')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  reportPost(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: ReportPostDto,
  ) {
    return this.svc.reportPost(userId, id, dto);
  }
}
