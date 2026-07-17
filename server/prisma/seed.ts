import { PrismaClient, TaskPriority, TaskStatus, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const password = await bcrypt.hash('123456', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@taskflow.ai' },
    update: {},
    create: {
      email: 'admin@taskflow.ai',
      name: 'System Admin',
      password,
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
      name: 'Alice Director',
      password,
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
      name: 'Bob Manager',
      password,
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
      name: 'Charlie Team Leader',
      password,
      role: Role.TEAM_LEADER,
      status: 'ACTIVE',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=leader',
    },
  });

  const teamMember = await prisma.user.upsert({
    where: { email: 'member@taskflow.ai' },
    update: {},
    create: {
      email: 'member@taskflow.ai',
      name: 'Diana Team Member',
      password,
      role: Role.TEAM_MEMBER,
      status: 'ACTIVE',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member',
    },
  });

  const personnel = await prisma.user.upsert({
    where: { email: 'personnel@taskflow.ai' },
    update: {},
    create: {
      email: 'personnel@taskflow.ai',
      name: 'Eve Personnel',
      password,
      role: Role.PERSONNEL,
      status: 'ACTIVE',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=personnel',
    },
  });

  console.log('  ✓ 6 users created (ADMIN, DIRECTOR, MANAGER, TEAM_LEADER, TEAM_MEMBER, PERSONNEL)');

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
    where: { id: teamMember.id },
    data: { departmentId: department.id, teamId: team.id },
  });

  await prisma.user.update({
    where: { id: personnel.id },
    data: { departmentId: department.id, teamId: team.id },
  });

  console.log('  ✓ Department & Team assignments done');

  const board = await prisma.board.upsert({
    where: { id: 'demo-board-001' },
    update: {},
    create: {
      id: 'demo-board-001',
      title: 'Project Phoenix',
      description: 'Main product development board with full team collaboration',
      color: '#6366f1',
      ownerId: admin.id,
      members: {
        create: [
          { userId: admin.id, role: 'OWNER' },
          { userId: director.id, role: 'ADMIN', invitedBy: admin.id },
          { userId: manager.id, role: 'ADMIN', invitedBy: admin.id },
          { userId: teamLeader.id, role: 'MEMBER', invitedBy: admin.id },
          { userId: teamMember.id, role: 'MEMBER', invitedBy: admin.id },
          { userId: personnel.id, role: 'VIEWER', invitedBy: admin.id },
        ],
      },
    },
  });

  console.log('  ✓ Board "Project Phoenix" with 6 members');

  const existingColumns = await prisma.column.findMany({ where: { boardId: board.id } });
  let columns;
  if (existingColumns.length > 0) {
    columns = existingColumns.sort((a, b) => a.order - b.order);
  } else {
    columns = await Promise.all(
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
  }

  const existingTasks = await prisma.task.findMany({ where: { boardId: board.id } });
  if (existingTasks.length === 0) {
    const tasks = [
      { title: 'Design landing page mockup', description: 'Create high-fidelity mockups for the new landing page', priority: TaskPriority.HIGH, status: TaskStatus.DONE, columnId: columns[4].id, position: 0, tags: ['design', 'ui'], assigneeId: teamMember.id },
      { title: 'Set up CI/CD pipeline', description: 'Configure GitHub Actions for automated testing and deployment', priority: TaskPriority.URGENT, status: TaskStatus.IN_PROGRESS, columnId: columns[2].id, position: 0, tags: ['devops', 'ci'], assigneeId: teamLeader.id },
      { title: 'Write API documentation', description: 'Document all REST API endpoints with examples', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO, columnId: columns[1].id, position: 0, tags: ['docs', 'api'], assigneeId: personnel.id },
      { title: 'Implement user authentication', description: 'JWT-based auth with refresh tokens', priority: TaskPriority.HIGH, status: TaskStatus.REVIEW, columnId: columns[3].id, position: 0, tags: ['auth', 'security'], assigneeId: teamMember.id },
      { title: 'Market research analysis', description: 'Analyze competitor pricing and features', priority: TaskPriority.LOW, status: TaskStatus.BACKLOG, columnId: columns[0].id, position: 0, tags: ['research', 'market'], assigneeId: manager.id },
      { title: 'Database optimization', description: 'Add indexes and optimize queries for performance', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO, columnId: columns[1].id, position: 1, tags: ['database', 'performance'], assigneeId: manager.id },
    ];

    for (const task of tasks) {
      await prisma.task.create({
        data: {
          ...task,
          boardId: board.id,
        },
      });
    }

    console.log(`  ✓ ${tasks.length} tasks created across all columns`);
  } else {
    console.log(`  ✓ ${existingTasks.length} tasks already exist, skipping`);
  }

  await prisma.activity.create({
    data: {
      type: 'BOARD_CREATED' as any,
      description: 'created board "Project Phoenix"',
      boardId: board.id,
      userId: admin.id,
    },
  });

  console.log('\n✅ Seed completed successfully!');
  console.log('\n📋 Login credentials (password: 123456):');
  console.log('   ADMIN        → admin@taskflow.ai');
  console.log('   DIRECTOR     → director@taskflow.ai');
  console.log('   MANAGER      → manager@taskflow.ai');
  console.log('   TEAM_LEADER  → leader@taskflow.ai');
  console.log('   TEAM_MEMBER  → member@taskflow.ai');
  console.log('   PERSONNEL    → personnel@taskflow.ai');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
