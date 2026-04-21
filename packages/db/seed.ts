import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables FIRST (before importing prisma client)
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env.dev') });

// Now import prisma after env vars are loaded
const { prisma } = await import('./src/client.js');
import { hashPassword } from '@better-auth/utils/password';
import type { IssueState, Priority } from './src/generated/prisma/index.js';

async function main() {
  console.log('🌱 Seeding database...');

  // Create test user
  const passwordHash = await hashPassword('testpassword123');
  
  const user = await prisma.user.upsert({
    where: { email: 'test@flowpig.dev' },
    update: {},
    create: {
      id: 'usr_test_admin_001',
      email: 'test@flowpig.dev',
      name: 'Test User',
      emailVerified: true,
    },
  });

  console.log('✅ Created test user:', user.email);

  await prisma.account.upsert({
    where: {
      providerId_accountId: {
        providerId: 'credential',
        accountId: user.id,
      },
    },
    update: {
      password: passwordHash,
    },
    create: {
      userId: user.id,
      providerId: 'credential',
      accountId: user.id,
      password: passwordHash,
    },
  });

  console.log('✅ Created credential account for test user');

  // Create sample workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      id: 'ws_sample_001',
      name: 'Acme Corp',
      slug: 'acme-corp',
      description: 'A sample workspace for testing',
      color: '#5E6AD2',
      ownerId: user.id,
      plan: 'FREE',
      settings: {
        defaultIssueState: 'BACKLOG',
        allowGuests: true,
      },
    },
  });

  console.log('✅ Created workspace:', workspace.name);

  // Add user as workspace member (owner)
  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: user.id,
      role: 'OWNER',
    },
  });

  // Create a team
  const team = await prisma.team.upsert({
    where: {
      workspaceId_key: {
        workspaceId: workspace.id,
        key: 'ENG',
      },
    },
    update: {},
    create: {
      id: 'team_eng_001',
      workspaceId: workspace.id,
      name: 'Engineering',
      key: 'ENG',
      color: '#5E6AD2',
      description: 'The engineering team',
    },
  });

  console.log('✅ Created team:', team.name);

  // Add user to team
  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: team.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      teamId: team.id,
      userId: user.id,
    },
  });

  // Create workflow states
  const states = [
    { name: 'Backlog', key: 'backlog', category: 'BACKLOG' as IssueState, position: 0, isDefault: true },
    { name: 'Todo', key: 'todo', category: 'TODO' as IssueState, position: 1 },
    { name: 'In Progress', key: 'in_progress', category: 'IN_PROGRESS' as IssueState, position: 2 },
    { name: 'In Review', key: 'in_review', category: 'IN_REVIEW' as IssueState, position: 3 },
    { name: 'Done', key: 'done', category: 'DONE' as IssueState, position: 4, isTerminal: true },
  ];

  for (const state of states) {
    await prisma.teamWorkflowState.upsert({
      where: {
        teamId_key: {
          teamId: team.id,
          key: state.key,
        },
      },
      update: {},
      create: {
        id: `state_${team.id}_${state.key}`,
        teamId: team.id,
        ...state,
      },
    });
  }

  console.log('✅ Created workflow states');

  // Create sample issues
  const issues = [
    {
      identifier: 'ENG-1',
      title: 'Set up CI/CD pipeline',
      description: { type: 'doc', content: [] },
      state: 'TODO' as IssueState,
      priority: 'HIGH' as Priority,
    },
    {
      identifier: 'ENG-2',
      title: 'Design database schema',
      description: { type: 'doc', content: [] },
      state: 'IN_PROGRESS' as IssueState,
      priority: 'URGENT' as Priority,
    },
    {
      identifier: 'ENG-3',
      title: 'Implement authentication',
      description: { type: 'doc', content: [] },
      state: 'BACKLOG' as IssueState,
      priority: 'MEDIUM' as Priority,
    },
    {
      identifier: 'ENG-4',
      title: 'Create API documentation',
      description: { type: 'doc', content: [] },
      state: 'BACKLOG' as IssueState,
      priority: 'LOW' as Priority,
    },
    {
      identifier: 'ENG-5',
      title: 'Fix navigation bug',
      description: { type: 'doc', content: [] },
      state: 'DONE' as IssueState,
      priority: 'HIGH' as Priority,
    },
  ];

  const backlogState = await prisma.teamWorkflowState.findFirst({
    where: { teamId: team.id, key: 'backlog' },
  });

  for (const issue of issues) {
    const workflowState = await prisma.teamWorkflowState.findFirst({
      where: { teamId: team.id, key: issue.state.toLowerCase() },
    });

    await prisma.issue.upsert({
      where: {
        workspaceId_identifier: {
          workspaceId: workspace.id,
          identifier: issue.identifier,
        },
      },
      update: {},
      create: {
        id: `issue_${issue.identifier.replace('-', '_')}`,
        workspaceId: workspace.id,
        teamId: team.id,
        creatorId: user.id,
        ...issue,
        workflowStateId: workflowState?.id ?? backlogState?.id,
      },
    });
  }

  console.log('✅ Created sample issues');

  // Create sample notes
  const notes = [
    {
      slug: 'engineering-handbook',
      title: 'Engineering Handbook',
      content: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Engineering Handbook' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Welcome to the engineering team! This document contains our best practices and guidelines.' }] },
        ],
      },
      emoji: '📚',
    },
    {
      slug: 'api-design-principles',
      title: 'API Design Principles',
      content: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'API Design Principles' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Key principles for designing REST APIs at Acme Corp.' }] },
        ],
      },
      emoji: '📐',
    },
    {
      slug: 'q1-roadmap',
      title: 'Q1 2025 Roadmap',
      content: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Q1 2025 Roadmap' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Our goals and initiatives for the first quarter.' }] },
        ],
      },
      emoji: '🗺️',
    },
  ];

  for (const note of notes) {
    await prisma.note.upsert({
      where: {
        workspaceId_slug: {
          workspaceId: workspace.id,
          slug: note.slug,
        },
      },
      update: {},
      create: {
        id: `note_${note.slug.replace(/-/g, '_')}`,
        workspaceId: workspace.id,
        createdById: user.id,
        lastEditedById: user.id,
        ...note,
      },
    });
  }

  console.log('✅ Created sample notes');

  // Create sample database
  const database = await prisma.database.upsert({
    where: { id: 'db_sample_001' },
    update: {},
    create: {
      id: 'db_sample_001',
      workspaceId: workspace.id,
      name: 'Product Tasks',
      description: 'Track product tasks and features',
    },
  });

  // Create database views
  await prisma.databaseView.upsert({
    where: { id: 'dbv_sample_001' },
    update: {},
    create: {
      id: 'dbv_sample_001',
      databaseId: database.id,
      name: 'All Tasks',
      type: 'TABLE',
    },
  });

  // Create database properties
  const titleProp = await prisma.databaseProperty.upsert({
    where: { id: 'dbp_title_001' },
    update: {},
    create: {
      id: 'dbp_title_001',
      databaseId: database.id,
      name: 'Title',
      type: 'TITLE',
      order: 0,
      required: true,
    },
  });

  const statusProp = await prisma.databaseProperty.upsert({
    where: { id: 'dbp_status_001' },
    update: {},
    create: {
      id: 'dbp_status_001',
      databaseId: database.id,
      name: 'Status',
      type: 'STATUS',
      order: 1,
      config: { options: [{ id: 'todo', name: 'To Do', color: '#6E6E6E' }, { id: 'in_progress', name: 'In Progress', color: '#F2A50C' }, { id: 'done', name: 'Done', color: '#0D9B6A' }] },
    },
  });

  const priorityProp = await prisma.databaseProperty.upsert({
    where: { id: 'dbp_priority_001' },
    update: {},
    create: {
      id: 'dbp_priority_001',
      databaseId: database.id,
      name: 'Priority',
      type: 'SELECT',
      order: 2,
      config: { options: [{ id: 'low', name: 'Low', color: '#6E6E6E' }, { id: 'medium', name: 'Medium', color: '#F2A50C' }, { id: 'high', name: 'High', color: '#E85913' }] },
    },
  });

  // Create sample rows
  const rows = [
    { title: 'Dark mode support', status: 'done', priority: 'medium' },
    { title: 'Command palette', status: 'in_progress', priority: 'high' },
    { title: 'Mobile responsiveness', status: 'todo', priority: 'low' },
  ];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const dbRow = await prisma.databaseRow.upsert({
      where: { id: `dbr_sample_00${i + 1}` },
      update: {},
      create: {
        id: `dbr_sample_00${i + 1}`,
        databaseId: database.id,
      },
    });

    await prisma.databaseCell.upsert({
      where: { rowId_propertyId: { rowId: dbRow.id, propertyId: titleProp.id } },
      update: {},
      create: {
        rowId: dbRow.id,
        propertyId: titleProp.id,
        value: row.title,
      },
    });

    await prisma.databaseCell.upsert({
      where: { rowId_propertyId: { rowId: dbRow.id, propertyId: statusProp.id } },
      update: {},
      create: {
        rowId: dbRow.id,
        propertyId: statusProp.id,
        value: row.status,
      },
    });

    await prisma.databaseCell.upsert({
      where: { rowId_propertyId: { rowId: dbRow.id, propertyId: priorityProp.id } },
      update: {},
      create: {
        rowId: dbRow.id,
        propertyId: priorityProp.id,
        value: row.priority,
      },
    });
  }

  console.log('✅ Created sample database');

  console.log('\n🎉 Seeding complete!');
  console.log('\nTest credentials:');
  console.log('  Email: test@flowpig.dev');
  console.log('  Password: testpassword123');
  console.log(`\nWorkspace: ${workspace.name} (${workspace.slug})`);
  console.log(`  URL: http://localhost:5173/${workspace.slug}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
