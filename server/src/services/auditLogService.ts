import prisma from '../config/prisma';

class AuditLogService {
  async log(data: {
    userId: string;
    action: string;
    entity: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      await prisma.auditLog.create({ data });
    } catch {
      // Silent fail — audit logging should never break the main operation
    }
  }

  async getLogs(params: {
    page?: number;
    limit?: number;
    userId?: string;
    entity?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 50, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (params.userId) where.userId = params.userId;
    if (params.entity) where.entity = params.entity;
    if (params.action) where.action = params.action;
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) (where.createdAt as any).gte = new Date(params.startDate);
      if (params.endDate) (where.createdAt as any).lte = new Date(params.endDate);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStats() {
    const totalLogs = await prisma.auditLog.count();
    const todayLogs = await prisma.auditLog.count({
      where: {
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    });
    const byAction = await prisma.auditLog.groupBy({
      by: ['action'],
      _count: true,
      orderBy: { _count: { action: 'desc' } },
      take: 10,
    });
    const byEntity = await prisma.auditLog.groupBy({
      by: ['entity'],
      _count: true,
      orderBy: { _count: { entity: 'desc' } },
    });

    return { totalLogs, todayLogs, byAction, byEntity };
  }
}

export default new AuditLogService();
