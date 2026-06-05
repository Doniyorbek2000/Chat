import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async createTicket(userId: string, dto: { category: string; title: string; body: string }) {
    if (!dto.category || !dto.title?.trim() || !dto.body?.trim()) {
      throw new BadRequestException('category, title and body required');
    }
    return this.prisma.supportTicket.create({
      data: { userId, ...dto },
      include: { attachments: true, replies: true },
    });
  }

  async getMyTickets(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.supportTicket.findMany({
        where: { userId },
        include: { attachments: true, replies: { orderBy: { createdAt: 'asc' }, include: { author: { select: { id: true, displayName: true, avatar: true, role: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.supportTicket.count({ where: { userId } }),
    ]);
    return { items, total, page, limit };
  }

  async getTicketById(userId: string, ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { attachments: true, replies: { orderBy: { createdAt: 'asc' }, include: { author: { select: { id: true, displayName: true, avatar: true, role: true } } } } },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.userId !== userId) throw new ForbiddenException();
    return ticket;
  }

  async addReply(userId: string, ticketId: string, body: string, isAdmin = false) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (!isAdmin && ticket.userId !== userId) throw new ForbiddenException();
    const reply = await this.prisma.supportReply.create({
      data: { ticketId, authorId: userId, body, isAdmin },
      include: { author: { select: { id: true, displayName: true, avatar: true, role: true } } },
    });
    if (ticket.status === 'OPEN' && isAdmin) {
      await this.prisma.supportTicket.update({ where: { id: ticketId }, data: { status: 'IN_PROGRESS' } });
    }
    return reply;
  }

  // Admin methods
  async adminGetTickets(params: { status?: string; page: number; limit: number }) {
    const { status, page, limit } = params;
    const skip = (page - 1) * limit;
    const where = status ? { status: status as any } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.supportTicket.findMany({
        where,
        include: { user: { select: { id: true, displayName: true, avatar: true, uid: true } }, attachments: true, replies: { include: { author: { select: { id: true, displayName: true, role: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async adminUpdateTicket(ticketId: string, dto: { status?: string; adminNote?: string }) {
    const data: any = {};
    if (dto.status) data.status = dto.status;
    if (dto.adminNote !== undefined) data.adminNote = dto.adminNote;
    if (dto.status === 'RESOLVED') data.resolvedAt = new Date();
    return this.prisma.supportTicket.update({ where: { id: ticketId }, data });
  }

  async adminGetLogs(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.uploadedLog.findMany({
        include: { user: { select: { id: true, displayName: true, uid: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.uploadedLog.count(),
    ]);
    return { items, total, page, limit };
  }

  async adminGetDeletionRequests(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.accountDeletionRequest.findMany({
        include: { user: { select: { id: true, displayName: true, uid: true, email: true, phone: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.accountDeletionRequest.count(),
    ]);
    return { items, total, page, limit };
  }

  // Policy pages
  async getPolicies(language?: string) {
    return this.prisma.policyPage.findMany({
      where: { isPublished: true, ...(language ? { language } : {}) },
      select: { id: true, slug: true, title: true, language: true, version: true, publishedAt: true },
      orderBy: { slug: 'asc' },
    });
  }

  async getPolicyBySlug(slug: string, language = 'uz') {
    const policy = await this.prisma.policyPage.findFirst({
      where: { slug, language, isPublished: true },
    });
    if (!policy) throw new NotFoundException('Policy not found');
    return policy;
  }

  async adminGetPolicies() {
    return this.prisma.policyPage.findMany({ orderBy: [{ slug: 'asc' }, { language: 'asc' }] });
  }

  async adminCreatePolicy(dto: any) {
    return this.prisma.policyPage.create({ data: dto });
  }

  async adminUpdatePolicy(id: string, dto: any) {
    return this.prisma.policyPage.update({ where: { id }, data: dto });
  }

  async adminPublishPolicy(id: string) {
    return this.prisma.policyPage.update({
      where: { id },
      data: { isPublished: true, publishedAt: new Date() },
    });
  }

  async adminUnpublishPolicy(id: string) {
    return this.prisma.policyPage.update({ where: { id }, data: { isPublished: false } });
  }

  async adminDeletePolicy(id: string) {
    return this.prisma.policyPage.delete({ where: { id } });
  }
}
