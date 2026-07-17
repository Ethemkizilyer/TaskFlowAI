import { PrismaClient } from '@prisma/client';

const SOFT_DELETE_MODELS = ['User', 'Board', 'Task', 'Comment'] as const;

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

prisma.$use(async (params, next) => {
  if (
    (params.action === 'findUnique' ||
      params.action === 'findFirst' ||
      params.action === 'findMany') &&
    SOFT_DELETE_MODELS.includes(params.model as any)
  ) {
    if (!params.args) params.args = {};
    if (!params.args.where) params.args.where = {};

    if (params.args.where.deletedAt === undefined) {
      params.args.where.deletedAt = null;
    }
  }

  if (
    params.action === 'delete' &&
    SOFT_DELETE_MODELS.includes(params.model as any)
  ) {
    params.action = 'update';
    params.args.data = { deletedAt: new Date() };
  }

  if (
    params.action === 'deleteMany' &&
    SOFT_DELETE_MODELS.includes(params.model as any)
  ) {
    params.action = 'updateMany';
    if (!params.args) params.args = {};
    params.args.data = { deletedAt: new Date() };
  }

  return next(params);
});

export default prisma;
