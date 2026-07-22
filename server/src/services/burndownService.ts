import prisma from '../config/prisma';

class BurndownService {
  async getBurndownData(boardId: string, startDate?: string, endDate?: string) {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { id: true, createdAt: true },
    });
    if (!board) throw new Error('Board not found');

    const start = startDate ? new Date(startDate) : board.createdAt;
    const end = endDate ? new Date(endDate) : new Date();

    const tasks = await prisma.task.findMany({
      where: {
        boardId,
        deletedAt: null,
        createdAt: { gte: start, lte: end },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const totalTasks = tasks.length;
    const days: { date: string; remaining: number; ideal: number; completed: number }[] = [];

    const dayMs = 1000 * 60 * 60 * 24;
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / dayMs));

    for (let i = 0; i <= totalDays; i++) {
      const dayStart = new Date(start);
      dayStart.setDate(start.getDate() + i);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);

      const createdUpToDay = tasks.filter((t) => new Date(t.createdAt) < dayEnd).length;
      const completedUpToDay = tasks.filter(
        (t) => t.status === 'DONE' && new Date(t.updatedAt) < dayEnd
      ).length;

      const remaining = createdUpToDay - completedUpToDay;
      const ideal = Math.max(0, Math.round(totalTasks * (1 - i / totalDays)));

      days.push({
        date: dayStart.toISOString().split('T')[0],
        remaining,
        ideal,
        completed: completedUpToDay,
      });
    }

    return {
      totalTasks,
      completedTasks: tasks.filter((t) => t.status === 'DONE').length,
      remainingTasks: tasks.filter((t) => t.status !== 'DONE').length,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      days,
    };
  }
}

export default new BurndownService();
