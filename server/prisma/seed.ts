import { PrismaClient, TaskPriority, TaskStatus, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@taskflow.ai' },
    update: {},
    create: {
      email: 'admin@taskflow.ai',
      name: 'Admin User',
      password: adminPassword,
      role: Role.ADMIN,
      status: 'ACTIVE',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    },
  });

  const director = await prisma.user.upsert({
    where: { email: 'director@taskflow.ai' },
    update: {},
    create: {
      email: 'director@taskflow.ai',
      name: 'Director User',
      password: userPassword,
      role: Role.DIRECTOR,
      status: 'ACTIVE',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=director',
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@taskflow.ai' },
    update: {},
    create: {
      email: 'manager@taskflow.ai',
      name: 'Manager User',
      password: userPassword,
      role: Role.MANAGER,
      status: 'ACTIVE',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=manager',
    },
  });

  const teamLeader = await prisma.user.upsert({
    where: { email: 'leader@taskflow.ai' },
    update: {},
    create: {
      email: 'leader@taskflow.ai',
      name: 'Team Leader',
      password: userPassword,
      role: Role.TEAM_LEADER,
      status: 'ACTIVE',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=leader',
    },
  });

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@taskflow.ai' },
    update: {},
    create: {
      email: 'demo@taskflow.ai',
      name: 'Demo User',
      password: userPassword,
      role: Role.PERSONNEL,
      status: 'ACTIVE',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
    },
  });

  const department = await prisma.department.upsert({
    where: { name: 'Engineering' },
    update: {},
    create: {
      name: 'Engineering',
      description: 'Software engineering department',
      directorId: director.id,
    },
  });

  const team = await prisma.team.upsert({
    where: { name: 'Frontend Team' },
    update: {},
    create: {
      name: 'Frontend Team',
      description: 'Frontend development team',
      departmentId: department.id,
      leaderId: teamLeader.id,
    },
  });

  await prisma.user.update({
    where: { id: manager.id },
    data: { departmentId: department.id },
  });

  await prisma.user.update({
    where: { id: teamLeader.id },
    data: { departmentId: department.id, teamId: team.id },
  });

  await prisma.user.update({
    where: { id: demoUser.id },
    data: { departmentId: department.id, teamId: team.id },
  });

  const board = await prisma.board.upsert({
    where: { id: 'demo-board-001' },
    update: {},
    create: {
      id: 'demo-board-001',
      title: 'Product Launch Sprint',
      description: 'Q1 product launch tasks and milestones',
      color: '#6366f1',
      ownerId: admin.id,
      members: {
        create: [
          { userId: admin.id, role: 'OWNER' },
          { userId: demoUser.id, role: 'MEMBER' },
        ],
      },
    },
  });

  const columns = await Promise.all(
    [
      { title: 'Backlog', status: TaskStatus.BACKLOG, order: 0 },
      { title: 'To Do', status: TaskStatus.TODO, order: 1 },
      { title: 'In Progress', status: TaskStatus.IN_PROGRESS, order: 2 },
      { title: 'Review', status: TaskStatus.REVIEW, order: 3 },
      { title: 'Done', status: TaskStatus.DONE, order: 4 },
    ].map((col) =>
      prisma.column.create({
        data: { ...col, boardId: board.id },
      })
    )
  );

  const tasks = [
    { title: 'Design landing page mockup', description: 'Create high-fidelity mockups for the new landing page', priority: TaskPriority.HIGH, status: TaskStatus.DONE, columnId: columns[4].id, position: 0, tags: ['design', 'ui'] },
    { title: 'Set up CI/CD pipeline', description: 'Configure GitHub Actions for automated testing and deployment', priority: TaskPriority.URGENT, status: TaskStatus.IN_PROGRESS, columnId: columns[2].id, position: 0, tags: ['devops', 'ci'] },
    { title: 'Write API documentation', description: 'Document all REST API endpoints with examples', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO, columnId: columns[1].id, position: 0, tags: ['docs', 'api'] },
    { title: 'Implement user authentication', description: 'JWT-based auth with refresh tokens', priority: TaskPriority.HIGH, status: TaskStatus.REVIEW, columnId: columns[3].id, position: 0, tags: ['auth', 'security'] },
    { title: 'Market research analysis', description: 'Analyze competitor pricing and features', priority: TaskPriority.LOW, status: TaskStatus.BACKLOG, columnId: columns[0].id, position: 0, tags: ['research', 'market'] },
    { title: 'Database optimization', description: 'Add indexes and optimize queries for performance', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO, columnId: columns[1].id, position: 1, tags: ['database', 'performance'] },
  ];

  for (const task of tasks) {
    await prisma.task.create({
      data: {
        ...task,
        boardId: board.id,
        assigneeId: Math.random() > 0.5 ? admin.id : demoUser.id,
      },
    });
  }

  await prisma.activity.create({
    data: {
      type: 'BOARD_CREATED',
      description: 'created board "Product Launch Sprint"',
      boardId: board.id,
      userId: admin.id,
    },
  });

  console.log('Seed completed successfully!');
  console.log('Admin login: admin@taskflow.ai / admin123');
  console.log('Director login: director@taskflow.ai / user123');
  console.log('Manager login: manager@taskflow.ai / user123');
  console.log('Team Leader login: leader@taskflow.ai / user123');
  console.log('Personnel login: demo@taskflow.ai / user123');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
