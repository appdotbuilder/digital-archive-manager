
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, archivesTable, accessLogsTable } from '../db/schema';
import { getUserAccessLogs } from '../handlers/get_user_access_logs';

describe('getUserAccessLogs', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return access logs for a specific user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'testuser@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User',
        role: 'user'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test category description'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create test archive
    const archiveResult = await db.insert(archivesTable)
      .values({
        title: 'Test Archive',
        description: 'Test archive description',
        file_name: 'test.pdf',
        file_path: '/uploads/test.pdf',
        file_type: 'pdf',
        file_size: 1024,
        category_id: categoryId,
        uploaded_by: userId
      })
      .returning()
      .execute();

    const archiveId = archiveResult[0].id;

    // Create test access logs
    await db.insert(accessLogsTable)
      .values([
        {
          user_id: userId,
          archive_id: archiveId,
          action: 'view',
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0'
        },
        {
          user_id: userId,
          archive_id: archiveId,
          action: 'download',
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0'
        }
      ])
      .execute();

    const result = await getUserAccessLogs(userId);

    expect(result).toHaveLength(2);
    expect(result[0].user_id).toEqual(userId);
    expect(result[0].archive_id).toEqual(archiveId);
    expect(['view', 'download']).toContain(result[0].action);
    expect(result[0].ip_address).toEqual('192.168.1.1');
    expect(result[0].user_agent).toEqual('Mozilla/5.0');
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].id).toBeDefined();
  });

  it('should return empty array for user with no access logs', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'testuser@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User',
        role: 'user'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const result = await getUserAccessLogs(userId);

    expect(result).toHaveLength(0);
  });

  it('should return logs ordered by created_at descending', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'testuser@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User',
        role: 'user'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test category description'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create test archive
    const archiveResult = await db.insert(archivesTable)
      .values({
        title: 'Test Archive',
        description: 'Test archive description',
        file_name: 'test.pdf',
        file_path: '/uploads/test.pdf',
        file_type: 'pdf',
        file_size: 1024,
        category_id: categoryId,
        uploaded_by: userId
      })
      .returning()
      .execute();

    const archiveId = archiveResult[0].id;

    // Create multiple access logs with small delay to ensure different timestamps
    await db.insert(accessLogsTable)
      .values({
        user_id: userId,
        archive_id: archiveId,
        action: 'view',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0'
      })
      .execute();

    // Add a small delay
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(accessLogsTable)
      .values({
        user_id: userId,
        archive_id: archiveId,
        action: 'download',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0'
      })
      .execute();

    const result = await getUserAccessLogs(userId);

    expect(result).toHaveLength(2);
    // Most recent log should be first (download)
    expect(result[0].action).toEqual('download');
    expect(result[1].action).toEqual('view');
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should only return logs for the specified user', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashedpassword',
        first_name: 'User',
        last_name: 'One',
        role: 'user'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashedpassword',
        first_name: 'User',
        last_name: 'Two',
        role: 'user'
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test category description'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create test archive
    const archiveResult = await db.insert(archivesTable)
      .values({
        title: 'Test Archive',
        description: 'Test archive description',
        file_name: 'test.pdf',
        file_path: '/uploads/test.pdf',
        file_type: 'pdf',
        file_size: 1024,
        category_id: categoryId,
        uploaded_by: user1Id
      })
      .returning()
      .execute();

    const archiveId = archiveResult[0].id;

    // Create access logs for both users
    await db.insert(accessLogsTable)
      .values([
        {
          user_id: user1Id,
          archive_id: archiveId,
          action: 'view',
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0'
        },
        {
          user_id: user2Id,
          archive_id: archiveId,
          action: 'download',
          ip_address: '192.168.1.2',
          user_agent: 'Chrome/91.0'
        }
      ])
      .execute();

    const user1Logs = await getUserAccessLogs(user1Id);
    const user2Logs = await getUserAccessLogs(user2Id);

    expect(user1Logs).toHaveLength(1);
    expect(user1Logs[0].user_id).toEqual(user1Id);
    expect(user1Logs[0].action).toEqual('view');

    expect(user2Logs).toHaveLength(1);
    expect(user2Logs[0].user_id).toEqual(user2Id);
    expect(user2Logs[0].action).toEqual('download');
  });
});
