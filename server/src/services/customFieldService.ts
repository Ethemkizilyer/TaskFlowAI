import prisma from '../config/prisma';

class CustomFieldService {
  async create(boardId: string, data: {
    name: string;
    type: string;
    options?: string[];
    required?: boolean;
    position?: number;
  }) {
    return prisma.customField.create({
      data: {
        boardId,
        name: data.name,
        type: data.type,
        options: data.options || [],
        required: data.required || false,
        position: data.position || 0,
      },
    });
  }

  async getByBoard(boardId: string) {
    return prisma.customField.findMany({
      where: { boardId },
      orderBy: { position: 'asc' },
    });
  }

  async update(id: string, data: {
    name?: string;
    type?: string;
    options?: string[];
    required?: boolean;
    position?: number;
  }) {
    return prisma.customField.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.customField.delete({ where: { id } });
  }

  async getTaskValues(taskId: string) {
    const values = await prisma.customFieldValue.findMany({
      where: { taskId },
      include: {
        customField: {
          select: { id: true, name: true, type: true, options: true, required: true },
        },
      },
    });
    return values.map((v) => ({
      id: v.id,
      fieldId: v.customFieldId,
      name: v.customField.name,
      type: v.customField.type,
      options: v.customField.options,
      required: v.customField.required,
      value: v.value,
    }));
  }

  async setTaskValue(customFieldId: string, taskId: string, value: string | null) {
    return prisma.customFieldValue.upsert({
      where: {
        customFieldId_taskId: { customFieldId, taskId },
      },
      create: { customFieldId, taskId, value },
      update: { value },
    });
  }

  async deleteTaskValue(customFieldId: string, taskId: string) {
    return prisma.customFieldValue.delete({
      where: {
        customFieldId_taskId: { customFieldId, taskId },
      },
    });
  }
}

export default new CustomFieldService();
