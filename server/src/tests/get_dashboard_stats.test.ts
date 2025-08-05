
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, archivesTable, categoriesTable, accessLogsTable } from '../db/schema';
import { getDashboardStats } from '../handlers/get_dashboard_stats';

describe('getDashboardStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero stats for empty database', async () => {
    const stats = await getDashboardStats();

    expect(stats.total_users).toEqual(0);
    expect(stats.total_archives).toEqual(0);
    expect(stats.total_categories).toEqual(0);
    expect(stats.recent_uploads).toEqual(0);
    expect(stats.recent_accesses).toEqual(0);
    expect(stats.storage_used).toEqual(0);
  });

  it('should count total users, archives, and categories', async () => {
    // Create test users
    await db.insert(usersTable).values([
      {
        email: 'user1@example.com',
        password_hash: 'hash1',
        first_name: 'John',
        last_name: 'Doe',
        role: 'user'
      },
      {
        email: 'user2@example.com',
        password_hash: 'hash2',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'admin'
      }
    ]).execute();

    // Create test categories
    await db.insert(categoriesTable).values([
      { name: 'Documents', description: 'Document files' },
      { name: 'Images', description: 'Image files' }
    ]).execute();

    // Get user ID for archive creation
    const users = await db.select().from(usersTable).execute();
    const userId = users[0].id;

    // Create test archives
    await db.insert(archivesTable).values([
      {
        title: 'Archive 1',
        file_name: 'file1.pdf',
        file_path: '/uploads/file1.pdf',
        file_type: 'pdf',
        file_size: 1024,
        uploaded_by: userId
      },
      {
        title: 'Archive 2',
        file_name: 'file2.jpg',
        file_path: '/uploads/file2.jpg',
        file_type: 'jpg',
        file_size: 2048,
        uploaded_by: userId
      }
    ]).execute();

    const stats = await getDashboardStats();

    expect(stats.total_users).toEqual(2);
    expect(stats.total_archives).toEqual(2);
    expect(stats.total_categories).toEqual(2);
    expect(stats.storage_used).toEqual(3072); // 1024 + 2048
  });

  it('should count recent uploads and accesses correctly', async () => {
    // Create test user
    const [user] = await db.insert(usersTable).values({
      email: 'user@example.com',
      password_hash: 'hash',
      first_name: 'John',
      last_name: 'Doe',
      role: 'user'
    }).returning().execute();

    // Create archives - one recent, one old
    const recentDate = new Date();
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 35); // 35 days ago

    const [recentArchive] = await db.insert(archivesTable).values({
      title: 'Recent Archive',
      file_name: 'recent.pdf',
      file_path: '/uploads/recent.pdf',
      file_type: 'pdf',
      file_size: 1024,
      uploaded_by: user.id,
      created_at: recentDate
    }).returning().execute();

    const [oldArchive] = await db.insert(archivesTable).values({
      title: 'Old Archive',
      file_name: 'old.pdf',
      file_path: '/uploads/old.pdf',
      file_type: 'pdf',
      file_size: 2048,
      uploaded_by: user.id,
      created_at: oldDate
    }).returning().execute();

    // Create access logs - some recent, some old
    await db.insert(accessLogsTable).values([
      {
        user_id: user.id,
        archive_id: recentArchive.id,
        action: 'view',
        created_at: recentDate
      },
      {
        user_id: user.id,
        archive_id: recentArchive.id,
        action: 'download',
        created_at: recentDate
      },
      {
        user_id: user.id,
        archive_id: oldArchive.id,
        action: 'view',
        created_at: oldDate
      }
    ]).execute();

    const stats = await getDashboardStats();

    expect(stats.total_archives).toEqual(2);
    expect(stats.recent_uploads).toEqual(1); // Only the recent archive
    expect(stats.recent_accesses).toEqual(2); // Only the two recent accesses
    expect(stats.storage_used).toEqual(3072); // 1024 + 2048
  });

  it('should handle null storage sum correctly', async () => {
    // Create user but no archives
    await db.insert(usersTable).values({
      email: 'user@example.com',
      password_hash: 'hash',
      first_name: 'John',
      last_name: 'Doe',
      role: 'user'
    }).execute();

    const stats = await getDashboardStats();

    expect(stats.total_users).toEqual(1);
    expect(stats.total_archives).toEqual(0);
    expect(stats.storage_used).toEqual(0); // Should handle null sum
  });
});
