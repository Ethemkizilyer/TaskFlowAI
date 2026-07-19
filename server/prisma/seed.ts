import { PrismaClient, TaskPriority, TaskStatus, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type UserSeed = {
  email: string;
  name: string;
  role: Role;
  avatar: string;
};

const userSeeds: UserSeed[] = [
  // ADMIN
  { email: 'admin@taskflow.ai', name: 'System Admin', role: Role.ADMIN, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin' },
  { email: 'admin2@taskflow.ai', name: 'Sarah Admin', role: Role.ADMIN, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin2' },

  // DIRECTOR
  { email: 'director@taskflow.ai', name: 'Alice Director', role: Role.DIRECTOR, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=director' },
  { email: 'director2@taskflow.ai', name: 'Marcus Director', role: Role.DIRECTOR, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=director2' },

  // MANAGER
  { email: 'manager@taskflow.ai', name: 'Bob Manager', role: Role.MANAGER, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=manager' },
  { email: 'manager2@taskflow.ai', name: 'Emma Manager', role: Role.MANAGER, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=manager2' },
  { email: 'manager3@taskflow.ai', name: 'James Manager', role: Role.MANAGER, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=manager3' },

  // TEAM_LEADER
  { email: 'leader@taskflow.ai', name: 'Charlie Team Leader', role: Role.TEAM_LEADER, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=leader' },
  { email: 'leader2@taskflow.ai', name: 'Diana Team Leader', role: Role.TEAM_LEADER, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=leader2' },

  // TEAM_MEMBER
  { email: 'member@taskflow.ai', name: 'Eve Team Member', role: Role.TEAM_MEMBER, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member' },
  { email: 'member2@taskflow.ai', name: 'Frank Team Member', role: Role.TEAM_MEMBER, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member2' },
  { email: 'member3@taskflow.ai', name: 'Grace Team Member', role: Role.TEAM_MEMBER, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member3' },
  { email: 'member4@taskflow.ai', name: 'Henry Team Member', role: Role.TEAM_MEMBER, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member4' },

  // PERSONNEL
  { email: 'personnel@taskflow.ai', name: 'Ivy Personnel', role: Role.PERSONNEL, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=personnel' },
  { email: 'personnel2@taskflow.ai', name: 'Jack Personnel', role: Role.PERSONNEL, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=personnel2' },
  { email: 'personnel3@taskflow.ai', name: 'Karen Personnel', role: Role.PERSONNEL, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=personnel3' },
];

async function main() {
  console.log('🌱 Seeding database...');

  const password = await bcrypt.hash('123456', 12);

  const users: Record<string, Awaited<ReturnType<typeof prisma.user.upsert>>> = {};

  for (const u of userSeeds) {
    const key = u.email.split('@')[0];
    users[key] = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        password,
        role: u.role,
        status: 'ACTIVE',
        avatar: u.avatar,
      },
    });
  }

  const roleCounts = userSeeds.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log(`  ✓ ${userSeeds.length} users created (${Object.entries(roleCounts).map(([r, c]) => `${r}: ${c}`).join(', ')})`);

  const department = await prisma.department.upsert({
    where: { name: 'Engineering' },
    update: {},
    create: {
      name: 'Engineering',
      description: 'Software engineering department',
      directorId: users.director.id,
    },
  });

  const team = await prisma.team.upsert({
    where: { name: 'Frontend Team' },
    update: {},
    create: {
      name: 'Frontend Team',
      description: 'Frontend development team',
      departmentId: department.id,
      leaderId: users.leader.id,
    },
  });

  const team2 = await prisma.team.upsert({
    where: { name: 'Backend Team' },
    update: {},
    create: {
      name: 'Backend Team',
      description: 'Backend development team',
      departmentId: department.id,
      leaderId: users.leader2.id,
    },
  });

  // Assign department & team
  const deptAssignments: Array<{ user: string; dept: boolean; team?: string }> = [
    { user: 'manager', dept: true },
    { user: 'manager2', dept: true },
    { user: 'manager3', dept: true },
    { user: 'leader', dept: true, team: 'Frontend Team' },
    { user: 'leader2', dept: true, team: 'Backend Team' },
    { user: 'member', dept: true, team: 'Frontend Team' },
    { user: 'member2', dept: true, team: 'Frontend Team' },
    { user: 'member3', dept: true, team: 'Backend Team' },
    { user: 'member4', dept: true, team: 'Backend Team' },
    { user: 'personnel', dept: true, team: 'Frontend Team' },
    { user: 'personnel2', dept: true, team: 'Backend Team' },
    { user: 'personnel3', dept: true },
  ];

  for (const a of deptAssignments) {
    const data: any = {};
    if (a.dept) data.departmentId = department.id;
    if (a.team === 'Frontend Team') data.teamId = team.id;
    if (a.team === 'Backend Team') data.teamId = team2.id;
    await prisma.user.update({ where: { id: users[a.user].id }, data });
  }

  console.log('  ✓ Department & Team assignments done');

  const board = await prisma.board.upsert({
    where: { id: 'demo-board-001' },
    update: {},
    create: {
      id: 'demo-board-001',
      title: 'Project Phoenix',
      description: 'Main product development board with full team collaboration',
      color: '#6366f1',
      ownerId: users.admin.id,
      members: {
        create: [
          { userId: users.admin.id, role: 'OWNER' },
          { userId: users.admin2.id, role: 'ADMIN', invitedBy: users.admin.id },
          { userId: users.director.id, role: 'ADMIN', invitedBy: users.admin.id },
          { userId: users.director2.id, role: 'ADMIN', invitedBy: users.admin.id },
          { userId: users.manager.id, role: 'ADMIN', invitedBy: users.admin.id },
          { userId: users.manager2.id, role: 'MEMBER', invitedBy: users.admin.id },
          { userId: users.manager3.id, role: 'MEMBER', invitedBy: users.admin.id },
          { userId: users.leader.id, role: 'MEMBER', invitedBy: users.admin.id },
          { userId: users.leader2.id, role: 'MEMBER', invitedBy: users.admin.id },
          { userId: users.member.id, role: 'MEMBER', invitedBy: users.admin.id },
          { userId: users.member2.id, role: 'MEMBER', invitedBy: users.admin.id },
          { userId: users.member3.id, role: 'MEMBER', invitedBy: users.admin.id },
          { userId: users.member4.id, role: 'MEMBER', invitedBy: users.admin.id },
          { userId: users.personnel.id, role: 'VIEWER', invitedBy: users.admin.id },
          { userId: users.personnel2.id, role: 'VIEWER', invitedBy: users.admin.id },
          { userId: users.personnel3.id, role: 'VIEWER', invitedBy: users.admin.id },
        ],
      },
    },
  });

  console.log('  ✓ Board "Project Phoenix" with 16 members');

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
      { title: 'Design landing page mockup', description: 'Create high-fidelity mockups for the new landing page', priority: TaskPriority.HIGH, status: TaskStatus.DONE, columnId: columns[4].id, position: 0, tags: ['design', 'ui'], assigneeId: users.member.id },
      { title: 'Set up CI/CD pipeline', description: 'Configure GitHub Actions for automated testing and deployment', priority: TaskPriority.URGENT, status: TaskStatus.IN_PROGRESS, columnId: columns[2].id, position: 0, tags: ['devops', 'ci'], assigneeId: users.leader.id },
      { title: 'Write API documentation', description: 'Document all REST API endpoints with examples', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO, columnId: columns[1].id, position: 0, tags: ['docs', 'api'], assigneeId: users.personnel.id },
      { title: 'Implement user authentication', description: 'JWT-based auth with refresh tokens', priority: TaskPriority.HIGH, status: TaskStatus.REVIEW, columnId: columns[3].id, position: 0, tags: ['auth', 'security'], assigneeId: users.member2.id },
      { title: 'Market research analysis', description: 'Analyze competitor pricing and features', priority: TaskPriority.LOW, status: TaskStatus.BACKLOG, columnId: columns[0].id, position: 0, tags: ['research', 'market'], assigneeId: users.manager.id },
      { title: 'Database optimization', description: 'Add indexes and optimize queries for performance', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO, columnId: columns[1].id, position: 1, tags: ['database', 'performance'], assigneeId: users.manager2.id },
      { title: 'Build component library', description: 'Create reusable Vue components with TailwindCSS', priority: TaskPriority.MEDIUM, status: TaskStatus.IN_PROGRESS, columnId: columns[2].id, position: 1, tags: ['frontend', 'components'], assigneeId: users.member3.id },
      { title: 'Implement WebSocket handlers', description: 'Set up Socket.io rooms for board collaboration', priority: TaskPriority.HIGH, status: TaskStatus.REVIEW, columnId: columns[3].id, position: 1, tags: ['backend', 'realtime'], assigneeId: users.leader2.id },
      { title: 'User onboarding flow', description: 'Design and implement the user onboarding experience', priority: TaskPriority.LOW, status: TaskStatus.BACKLOG, columnId: columns[0].id, position: 1, tags: ['ux', 'onboarding'], assigneeId: users.manager3.id },
      { title: 'Set up PostgreSQL backups', description: 'Configure automated daily database backups', priority: TaskPriority.URGENT, status: TaskStatus.TODO, columnId: columns[1].id, position: 2, tags: ['devops', 'database'], assigneeId: users.member4.id },
      { title: 'Write unit tests for auth', description: 'Cover auth controller with Jest tests', priority: TaskPriority.MEDIUM, status: TaskStatus.DONE, columnId: columns[4].id, position: 1, tags: ['testing', 'auth'], assigneeId: users.member.id },
      { title: 'Optimize bundle size', description: 'Reduce frontend bundle size with code splitting', priority: TaskPriority.LOW, status: TaskStatus.IN_PROGRESS, columnId: columns[2].id, position: 2, tags: ['performance', 'frontend'], assigneeId: users.member2.id },
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
      userId: users.admin.id,
    },
  });

  console.log('\n✅ Seed completed successfully!');
  console.log('\n📋 Login credentials (password: 123456):');
  console.log('   ADMIN         → admin@taskflow.ai, admin2@taskflow.ai');
  console.log('   DIRECTOR      → director@taskflow.ai, director2@taskflow.ai');
  console.log('   MANAGER       → manager@taskflow.ai, manager2@taskflow.ai, manager3@taskflow.ai');
  console.log('   TEAM_LEADER   → leader@taskflow.ai, leader2@taskflow.ai');
  console.log('   TEAM_MEMBER   → member@taskflow.ai, member2@taskflow.ai, member3@taskflow.ai, member4@taskflow.ai');
  console.log('   PERSONNEL     → personnel@taskflow.ai, personnel2@taskflow.ai, personnel3@taskflow.ai');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
