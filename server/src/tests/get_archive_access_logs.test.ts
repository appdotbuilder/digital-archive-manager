
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, archivesTable, categoriesTable, accessLogsTable } from '../db/schema';
import { getArchiveAccessLogs } from '../handlers/get_archive_access_logs';

describe('getArchiveAccessLogs', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return access logs for a specific archive', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
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
        description: 'A test category'
      })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create test archive
    const archiveResult = await db.insert(archivesTable)
      .values({
        title: 'Test Archive',
        description: 'A test archive',
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

    // Create access logs for this archive
    await db.insert(accessLogsTable)
      .values([
        {
          user_id: userId,
          archive_id: archiveId,
          action: 'view',
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0 (Test Browser)'
        },
        {
          user_id: userId,
          archive_id: archiveId,
          action: 'download',
          ip_address: '192.168.1.2',
          user_agent: 'Mozilla/5.0 (Another Browser)'
        }
      ])
      .execute();

    const result = await getArchiveAccessLogs(archiveId);

    expect(result).toHaveLength(2);
    expect(result[0].archive_id).toBe(archiveId);
    expect(result[0].user_id).toBe(userId);
    expect(result[0].action).toBe('view');
    expect(result[0].ip_address).toBe('192.168.1.1');
    expect(result[0].user_agent).toBe('Mozilla/5.0 (Test Browser)');
    expect(result[0].created_at).toBeInstanceOf(Date);

    expect(result[1].archive_id).toBe(archiveId);
    expect(result[1].action).toBe('download');
    expect(result[1].ip_address).toBe('192.168.1.2');
  });

  it('should return empty array for archive with no access logs', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'user'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test archive without any access logs
    const archiveResult = await db.insert(archivesTable)
      .values({
        title: 'Test Archive',
        description: 'A test archive',
        file_name: 'test.pdf',
        file_path: '/uploads/test.pdf',
        file_type: 'pdf',
        file_size: 1024,
        category_id: null,
        uploaded_by: userId
      })
      .returning()
      .execute();
    const archiveId = archiveResult[0].id;

    const result = await getArchiveAccessLogs(archiveId);

    expect(result).toHaveLength(0);
  });

  it('should only return logs for the specified archive', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'user'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create two test archives
    const archiveResults = await db.insert(archivesTable)
      .values([
        {
          title: 'Archive 1',
          description: 'First archive',
          file_name: 'test1.pdf',
          file_path: '/uploads/test1.pdf',
          file_type: 'pdf',
          file_size: 1024,
          category_id: null,
          uploaded_by: userId
        },
        {
          title: 'Archive 2',
          description: 'Second archive',
          file_name: 'test2.pdf',
          file_path: '/uploads/test2.pdf',
          file_type: 'pdf',
          file_size: 2048,
          category_id: null,
          uploaded_by: userId
        }
      ])
      .returning()
      .execute();
    
    const archive1Id = archiveResults[0].id;
    const archive2Id = archiveResults[1].id;

    // Create access logs for both archives
    await db.insert(accessLogsTable)
      .values([
        {
          user_id: userId,
          archive_id: archive1Id,
          action: 'view',
          ip_address: '192.168.1.1',
          user_agent: null
        },
        {
          user_id: userId,
          archive_id: archive2Id,
          action: 'download',
          ip_address: '192.168.1.2',
          user_agent: null
        },
        {
          user_id: userId,
          archive_id: archive1Id,
          action: 'download',
          ip_address: '192.168.1.3',
          user_agent: null
        }
      ])
      .execute();

    const result = await getArchiveAccessLogs(archive1Id);

    expect(result).toHaveLength(2);
    result.forEach(log => {
      expect(log.archive_id).toBe(archive1Id);
    });
  });
});
