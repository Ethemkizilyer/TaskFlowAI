import prisma from '../config/prisma';

class RecurringTaskService {
  async create(data: {
    boardId: string;
    title: string;
    description?: string;
    priority?: string;
    columnId?: string;
    assigneeId?: string;
    frequency: string;
    interval?: number;
    nextRunAt: string;
    createdById: string;
  }) {
    return prisma.recurringTask.create({
      data: {
        boardId: data.boardId,
        title: data.title,
        description: data.description,
        priority: data.priority || 'MEDIUM',
        columnId: data.columnId,
        assigneeId: data.assigneeId,
        frequency: data.frequency,
        interval: data.interval || 1,
        nextRunAt: new Date(data.nextRunAt),
        createdById: data.createdById,
      },
    });
  }

  async getByBoard(boardId: string) {
    return prisma.recurringTask.findMany({
      where: { boardId },
      orderBy: { nextRunAt: 'asc' },
    });
  }

  async update(id: string, data: {
    title?: string;
    description?: string;
    priority?: string;
    columnId?: string;
    assigneeId?: string;
    frequency?: string;
    interval?: number;
    nextRunAt?: string;
    isActive?: boolean;
  }) {
    const updateData: Record<string, unknown> = { ...data };
    if (data.nextRunAt) updateData.nextRunAt = new Date(data.nextRunAt);
    return prisma.recurringTask.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string) {
    return prisma.recurringTask.delete({ where: { id } });
  }

  async toggle(id: string) {
    const rt = await prisma.recurringTask.findUnique({ where: { id } });
    if (!rt) throw new Error('Recurring task not found');
    return prisma.recurringTask.update({
      where: { id },
      data: { isActive: !rt.isActive },
    });
  }

  async processDueTasks(): Promise<number> {
    const now = new Date();
    const dueTasks = await prisma.recurringTask.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: now },
      },
    });

    let created = 0;
    for (const rt of dueTasks) {
      const board = await prisma.board.findUnique({
        where: { id: rt.boardId },
        select: { columns: { orderBy: { position: 'asc' }, take: 1 } },
      });

      const firstColumn = board?.columns[0];
      const columnId = rt.columnId || firstColumn?.id || null;

      await prisma.task.create({
        data: {
          boardId: rt.boardId,
          columnId,
          title: rt.title,
          description: rt.description,
          priority: rt.priority as any,
          assigneeId: rt.assigneeId,
          position: 0,
        },
      });

      const nextRun = this.computeNextRun(rt.frequency, rt.interval, now);
      await prisma.recurringTask.update({
        where: { id: rt.id },
        data: {
          lastRunAt: now,
          nextRunAt: nextRun,
        },
      });
      created++;
    }

    return created;
  }

  private computeNextRun(frequency: string, interval: number, from: Date): Date {
    const next = new Date(from);
    switch (frequency) {
      case 'DAILY':
        next.setDate(next.getDate() + interval);
        break;
      case 'WEEKLY':
        next.setDate(next.getDate() + 7 * interval);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + interval);
        break;
      default:
        next.setDate(next.getDate() + 1);
    }
    return next;
  }
}

export default new RecurringTaskService();
