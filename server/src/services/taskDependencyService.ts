import prisma from '../config/prisma';

class TaskDependencyService {
  async addDependency(boardId: string, taskId: string, dependsOnId: string) {
    if (taskId === dependsOnId) {
      throw new Error('A task cannot depend on itself');
    }

    const [task, dependsOn] = await Promise.all([
      prisma.task.findFirst({ where: { id: taskId, boardId } }),
      prisma.task.findFirst({ where: { id: dependsOnId, boardId } }),
    ]);

    if (!task) throw new Error('Task not found');
    if (!dependsOn) throw new Error('Dependency task not found');

    const existing = await prisma.taskDependency.findUnique({
      where: {
        taskId_dependsOnId: { taskId, dependsOnId },
      },
    });
    if (existing) throw new Error('Dependency already exists');

    if (await this.wouldCreateCycle(taskId, dependsOnId)) {
      throw new Error('This dependency would create a circular dependency');
    }

    return prisma.taskDependency.create({
      data: { taskId, dependsOnId },
    });
  }

  async removeDependency(boardId: string, taskId: string, dependsOnId: string) {
    const task = await prisma.task.findFirst({ where: { id: taskId, boardId } });
    if (!task) throw new Error('Task not found');

    return prisma.taskDependency.delete({
      where: {
        taskId_dependsOnId: { taskId, dependsOnId },
      },
    });
  }

  async getDependencies(boardId: string, taskId: string) {
    const task = await prisma.task.findFirst({ where: { id: taskId, boardId } });
    if (!task) throw new Error('Task not found');

    const [blockedBy, blocking] = await Promise.all([
      prisma.taskDependency.findMany({
        where: { taskId },
        include: {
          dependsOn: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              boardId: true,
            },
          },
        },
      }),
      prisma.taskDependency.findMany({
        where: { dependsOnId: taskId },
        include: {
          task: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              boardId: true,
            },
          },
        },
      }),
    ]);

    return {
      blockedBy: blockedBy.map((d) => ({
        id: d.dependsOn.id,
        title: d.dependsOn.title,
        status: d.dependsOn.status,
        priority: d.dependsOn.priority,
        isDone: d.dependsOn.status === 'DONE',
      })),
      blocking: blocking.map((d) => ({
        id: d.task.id,
        title: d.task.title,
        status: d.task.status,
        priority: d.task.priority,
        isDone: d.task.status === 'DONE',
      })),
    };
  }

  async getBoardDependencies(boardId: string) {
    const tasks = await prisma.task.findMany({
      where: { boardId, deletedAt: null },
      select: {
        id: true,
        title: true,
        status: true,
        columnId: true,
        position: true,
        blockedByTasks: {
          include: {
            dependsOn: {
              select: { id: true, title: true, status: true },
            },
          },
        },
        blockingTasks: {
          include: {
            task: {
              select: { id: true, title: true, status: true },
            },
          },
        },
      },
    });

    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      columnId: task.columnId,
      position: task.position,
      blockedBy: task.blockedByTasks.map((d) => ({
        id: d.dependsOn.id,
        title: d.dependsOn.title,
        status: d.dependsOn.status,
        isDone: d.dependsOn.status === 'DONE',
      })),
      blocking: task.blockingTasks.map((d) => ({
        id: d.task.id,
        title: d.task.title,
        status: d.task.status,
        isDone: d.task.status === 'DONE',
      })),
    }));
  }

  async isTaskBlocked(taskId: string): Promise<boolean> {
    const blockingDeps = await prisma.taskDependency.findMany({
      where: { taskId },
      include: { dependsOn: { select: { status: true } } },
    });
    return blockingDeps.some((d) => d.dependsOn.status !== 'DONE');
  }

  private async wouldCreateCycle(taskId: string, dependsOnId: string): Promise<boolean> {
    const visited = new Set<string>();
    const queue = [dependsOnId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === taskId) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      const deps = await prisma.taskDependency.findMany({
        where: { taskId: current },
        select: { dependsOnId: true },
      });
      queue.push(...deps.map((d) => d.dependsOnId));
    }

    return false;
  }
}

export default new TaskDependencyService();
