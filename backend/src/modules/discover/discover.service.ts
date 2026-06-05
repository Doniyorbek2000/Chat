import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { CreatePostDto, CreateCommentDto, ReportPostDto, UpdatePostDto } from './dto/discover.dto';

const AUTO_HIDE_REPORT_THRESHOLD = 5;

@Injectable()
export class DiscoverService {
  constructor(
    private prisma: PrismaService,
    private wallet: WalletService,
  ) {}

  async getPosts(userId: string, opts: {
    country?: string; following?: boolean; trend?: boolean; page?: number; limit?: number;
  }) {
    const { country, following, trend, page = 1, limit = 20 } = opts;
    const skip = (page - 1) * limit;

    // Get blocked user ids - using Ban model (bannedById = admin/user who banned, userId = person being banned)
    const blocks = await this.prisma.ban.findMany({
      where: {
        OR: [
          { adminId: userId },
          { userId },
        ],
      },
      select: { userId: true, adminId: true },
    });
    const blockedIds = blocks.map(b => b.userId === userId ? b.adminId : b.userId);

    let authorIds: string[] | undefined;
    if (following) {
      const follows = await this.prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      authorIds = follows.map(f => f.followingId);
    }

    const where: any = {
      moderationStatus: 'APPROVED',
      isHidden: false,
      authorId: { notIn: blockedIds },
      ...(country ? { country } : {}),
      ...(authorIds !== undefined ? { authorId: { in: authorIds, notIn: blockedIds } } : {}),
    };

    const orderBy: any = trend
      ? [{ likeCount: 'desc' }, { createdAt: 'desc' }]
      : { createdAt: 'desc' };

    const [items, total] = await Promise.all([
      this.prisma.discoverPost.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          author: { select: { id: true, uid: true, displayName: true, avatar: true, level: true, vipLevel: true, country: true, } },
          images: { orderBy: { sortOrder: 'asc' } },
          likes: { where: { userId }, select: { id: true } },
          _count: { select: { comments: true, likes: true } },
        },
      }),
      this.prisma.discoverPost.count({ where }),
    ]);

    return {
      items: items.map(p => ({ ...p, isLiked: p.likes.length > 0 })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async getPostById(userId: string, postId: string) {
    const post = await this.prisma.discoverPost.findUnique({
      where: { id: postId },
      include: {
        author: { select: { id: true, uid: true, displayName: true, avatar: true, level: true, vipLevel: true, country: true, } },
        images: { orderBy: { sortOrder: 'asc' } },
        likes: { where: { userId }, select: { id: true } },
        _count: { select: { comments: true, likes: true } },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    return { ...post, isLiked: post.likes.length > 0 };
  }

  async createPost(userId: string, dto: CreatePostDto) {
    const post = await this.prisma.discoverPost.create({
      data: {
        authorId: userId,
        text: dto.text,
        country: dto.country,
        moderationStatus: 'APPROVED',
        images: dto.imageUrls?.length
          ? { create: dto.imageUrls.map((url, i) => ({ url, sortOrder: i })) }
          : undefined,
      },
      include: {
        author: { select: { id: true, uid: true, displayName: true, avatar: true } },
        images: true,
      },
    });
    return post;
  }

  async updatePost(userId: string, postId: string, dto: UpdatePostDto) {
    const post = await this.prisma.discoverPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) throw new ForbiddenException();

    return this.prisma.discoverPost.update({
      where: { id: postId },
      data: { text: dto.text },
    });
  }

  async deletePost(userId: string, postId: string, isAdmin = false) {
    const post = await this.prisma.discoverPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (!isAdmin && post.authorId !== userId) throw new ForbiddenException();
    await this.prisma.discoverPost.delete({ where: { id: postId } });
    return { deleted: true };
  }

  async likePost(userId: string, postId: string) {
    await this.prisma.discoverPost.findUniqueOrThrow({ where: { id: postId } });
    await this.prisma.$transaction([
      this.prisma.discoverPostLike.upsert({
        where: { postId_userId: { postId, userId } },
        create: { postId, userId },
        update: {},
      }),
      this.prisma.discoverPost.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
      }),
    ]);
    return { liked: true };
  }

  async unlikePost(userId: string, postId: string) {
    const like = await this.prisma.discoverPostLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (!like) return { liked: false };
    await this.prisma.$transaction([
      this.prisma.discoverPostLike.delete({ where: { postId_userId: { postId, userId } } }),
      this.prisma.discoverPost.update({
        where: { id: postId },
        data: { likeCount: { decrement: 1 } },
      }),
    ]);
    return { liked: false };
  }

  async getComments(postId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.discoverPostComment.findMany({
        where: { postId },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
        include: {
          author: { select: { id: true, uid: true, displayName: true, avatar: true, level: true } },
        },
      }),
      this.prisma.discoverPostComment.count({ where: { postId } }),
    ]);
    return { items, total, page, limit };
  }

  async addComment(userId: string, postId: string, dto: CreateCommentDto) {
    await this.prisma.discoverPost.findUniqueOrThrow({ where: { id: postId } });
    const comment = await this.prisma.$transaction(async (tx) => {
      const c = await tx.discoverPostComment.create({
        data: { postId, authorId: userId, text: dto.text },
        include: {
          author: { select: { id: true, uid: true, displayName: true, avatar: true } },
        },
      });
      await tx.discoverPost.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      });
      return c;
    });
    return comment;
  }

  async deleteComment(userId: string, postId: string, commentId: string) {
    const comment = await this.prisma.discoverPostComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId) throw new ForbiddenException();
    await this.prisma.$transaction([
      this.prisma.discoverPostComment.delete({ where: { id: commentId } }),
      this.prisma.discoverPost.update({
        where: { id: postId },
        data: { commentCount: { decrement: 1 } },
      }),
    ]);
    return { deleted: true };
  }

  async reportPost(userId: string, postId: string, dto: ReportPostDto) {
    await this.prisma.discoverPost.findUniqueOrThrow({ where: { id: postId } });

    await this.prisma.discoverPostReport.upsert({
      where: { postId_reporterId: { postId, reporterId: userId } },
      create: { postId, reporterId: userId, reason: dto.reason },
      update: { reason: dto.reason },
    });

    // Auto-hide if report threshold reached
    const reportCount = await this.prisma.discoverPostReport.count({ where: { postId } });
    if (reportCount >= AUTO_HIDE_REPORT_THRESHOLD) {
      await this.prisma.discoverPost.update({
        where: { id: postId },
        data: { reportCount, isHidden: true },
      });
    } else {
      await this.prisma.discoverPost.update({
        where: { id: postId },
        data: { reportCount },
      });
    }

    return { reported: true };
  }

  async giftPost(userId: string, postId: string, giftId: string, amount = 1) {
    const post = await this.prisma.discoverPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const gift = await this.prisma.gift.findUnique({ where: { id: giftId } });
    if (!gift) throw new NotFoundException('Gift not found');

    const totalCost = gift.coinPrice * amount;

    await this.wallet.deductCoins(userId, totalCost, `Gift post: ${gift.name}`, postId);

    await this.prisma.discoverPostGift.create({
      data: { postId, senderId: userId, giftId, amount },
    });

    return { success: true };
  }

  // Admin methods
  async adminGetPosts(opts: { status?: string; page?: number; limit?: number }) {
    const { status, page = 1, limit = 20 } = opts;
    const skip = (page - 1) * limit;
    const where: any = status ? { moderationStatus: status } : {};
    const [items, total] = await Promise.all([
      this.prisma.discoverPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          author: { select: { id: true, uid: true, displayName: true, avatar: true } },
          images: true,
          _count: { select: { reports: true, comments: true, likes: true } },
        },
      }),
      this.prisma.discoverPost.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async adminApprovePost(postId: string) {
    return this.prisma.discoverPost.update({
      where: { id: postId },
      data: { moderationStatus: 'APPROVED', isHidden: false },
    });
  }

  async adminRejectPost(postId: string, reason?: string) {
    return this.prisma.discoverPost.update({
      where: { id: postId },
      data: { moderationStatus: 'REJECTED', isHidden: true },
    });
  }

  async adminGetReports(opts: { resolved?: boolean; page?: number; limit?: number }) {
    const { resolved, page = 1, limit = 20 } = opts;
    const skip = (page - 1) * limit;
    const where: any = resolved !== undefined ? { isResolved: resolved } : {};
    const [items, total] = await Promise.all([
      this.prisma.discoverPostReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          post: { include: { author: { select: { id: true, displayName: true } } } },
          reporter: { select: { id: true, displayName: true } },
        },
      }),
      this.prisma.discoverPostReport.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async adminResolveReport(reportId: string) {
    return this.prisma.discoverPostReport.update({
      where: { id: reportId },
      data: { isResolved: true, resolvedAt: new Date() },
    });
  }
}
