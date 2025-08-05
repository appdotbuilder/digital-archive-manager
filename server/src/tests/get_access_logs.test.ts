
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, archivesTable, accessLogsTable, categoriesTable } from '../db/schema';
import { getAccessLogs } from '../handlers/get_access_logs';

describe('getAccessLogs', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no access logs exist', async () => {
    const result = await getAccessLogs();
    expect(result).toEqual([]);
  });

  it('should return all access logs without filters', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'user'
      })
      .returning()
      .execute();

    // Create test category
    const category = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test category description'
      })
      .returning()
      .execute();

    // Create test archive
    const archive = await db.insert(archivesTable)
      .values({
        title: 'Test Archive',
        description: 'Test archive description',
        file_name: 'test.pdf',
        file_path: '/uploads/test.pdf',
        file_type: 'pdf',
        file_size: 1024,
        category_id: category[0].id,
        uploaded_by: user[0].id
      })
      .returning()
      .execute();

    // Create test access logs - first one created will be older
    const log1 = await db.insert(accessLogsTable)
      .values({
        user_id: user[0].id,
        archive_id: archive[0].id,
        action: 'view',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0'
      })
      .returning()
      .execute();

    // Add a small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const log2 = await db.insert(accessLogsTable)
      .values({
        user_id: user[0].id,
        archive_id: archive[0].id,
        action: 'download',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0'
      })
      .returning()
      .execute();

    const result = await getAccessLogs();
    
    expect(result).toHaveLength(2);
    // Most recent first due to ordering (download was created after view)
    expect(result[0].action).toEqual('download');
    expect(result[1].action).toEqual('view');
    expect(result[0].user_id).toEqual(user[0].id);
    expect(result[0].archive_id).toEqual(archive[0].id);
    expect(result[0].ip_address).toEqual('192.168.1.1');
    expect(result[0].user_agent).toEqual('Mozilla/5.0');
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should filter by user_id', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          password_hash: 'hashed_password',
          first_name: 'User',
          last_name: 'One',
          role: 'user'
        },
        {
          email: 'user2@example.com',
          password_hash: 'hashed_password',
          first_name: 'User',
          last_name: 'Two',
          role: 'user'
        }
      ])
      .returning()
      .execute();

    // Create test archive
    const archive = await db.insert(archivesTable)
      .values({
        title: 'Test Archive',
        description: 'Test archive description',
        file_name: 'test.pdf',
        file_path: '/uploads/test.pdf',
        file_type: 'pdf',
        file_size: 1024,
        uploaded_by: users[0].id
      })
      .returning()
      .execute();

    // Create access logs for different users
    await db.insert(accessLogsTable)
      .values([
        {
          user_id: users[0].id,
          archive_id: archive[0].id,
          action: 'view'
        },
        {
          user_id: users[1].id,
          archive_id: archive[0].id,
          action: 'download'
        }
      ])
      .execute();

    const result = await getAccessLogs({ user_id: users[0].id });
    
    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(users[0].id);
    expect(result[0].action).toEqual('view');
  });

  it('should filter by action', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'user'
      })
      .returning()
      .execute();

    // Create test archive
    const archive = await db.insert(archivesTable)
      .values({
        title: 'Test Archive',
        description: 'Test archive description',
        file_name: 'test.pdf',
        file_path: '/uploads/test.pdf',
        file_type: 'pdf',
        file_size: 1024,
        uploaded_by: user[0].id
      })
      .returning()
      .execute();

    // Create access logs with different actions
    await db.insert(accessLogsTable)
      .values([
        {
          user_id: user[0].id,
          archive_id: archive[0].id,
          action: 'view'
        },
        {
          user_id: user[0].id,
          archive_id: archive[0].id,
          action: 'download'
        },
        {
          user_id: user[0].id,
          archive_id: archive[0].id,
          action: 'view'
        }
      ])
      .execute();

    const result = await getAccessLogs({ action: 'view' });
    
    expect(result).toHaveLength(2);
    result.forEach(log => {
      expect(log.action).toEqual('view');
    });
  });

  it('should filter by date range', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'user'
      })
      .returning()
      .execute();

    // Create test archive
    const archive = await db.insert(archivesTable)
      .values({
        title: 'Test Archive',
        description: 'Test archive description',
        file_name: 'test.pdf',
        file_path: '/uploads/test.pdf',
        file_type: 'pdf',
        file_size: 1024,
        uploaded_by: user[0].id
      })
      .returning()
      .execute();

    // Create access logs
    await db.insert(accessLogsTable)
      .values([
        {
          user_id: user[0].id,
          archive_id: archive[0].id,
          action: 'view'
        },
        {
          user_id: user[0].id,
          archive_id: archive[0].id,
          action: 'download'
        }
      ])
      .execute();

    // Test date filtering - use a wider range to include the created records
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await getAccessLogs({
      start_date: yesterday,
      end_date: tomorrow
    });

    expect(result.length).toBeGreaterThan(0);
    result.forEach(log => {
      expect(log.created_at).toBeInstanceOf(Date);
      expect(log.created_at >= yesterday).toBe(true);
      expect(log.created_at <= tomorrow).toBe(true);
    });
  });

  it('should respect pagination limits', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'user'
      })
      .returning()
      .execute();

    // Create test archive
    const archive = await db.insert(archivesTable)
      .values({
        title: 'Test Archive',
        description: 'Test archive description',
        file_name: 'test.pdf',
        file_path: '/uploads/test.pdf',
        file_type: 'pdf',
        file_size: 1024,
        uploaded_by: user[0].id
      })
      .returning()
      .execute();

    // Create multiple access logs
    const logValues = Array.from({ length: 5 }, () => ({
      user_id: user[0].id,
      archive_id: archive[0].id,
      action: 'view' as const
    }));

    await db.insert(accessLogsTable)
      .values(logValues)
      .execute();

    // Test limit
    const limitedResult = await getAccessLogs({ limit: 3 });
    expect(limitedResult).toHaveLength(3);

    // Test offset
    const offsetResult = await getAccessLogs({ limit: 2, offset: 2 });
    expect(offsetResult).toHaveLength(2);
  });

  it('should combine multiple filters', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          password_hash: 'hashed_password',
          first_name: 'User',
          last_name: 'One',
          role: 'user'
        },
        {
          email: 'user2@example.com',
          password_hash: 'hashed_password',
          first_name: 'User',
          last_name: 'Two',
          role: 'user'
        }
      ])
      .returning()
      .execute();

    // Create test archive
    const archive = await db.insert(archivesTable)
      .values({
        title: 'Test Archive',
        description: 'Test archive description',
        file_name: 'test.pdf',
        file_path: '/uploads/test.pdf',
        file_type: 'pdf',
        file_size: 1024,
        uploaded_by: users[0].id
      })
      .returning()
      .execute();

    // Create access logs with different combinations
    await db.insert(accessLogsTable)
      .values([
        {
          user_id: users[0].id,
          archive_id: archive[0].id,
          action: 'view'
        },
        {
          user_id: users[0].id,
          archive_id: archive[0].id,
          action: 'download'
        },
        {
          user_id: users[1].id,
          archive_id: archive[0].id,
          action: 'view'
        }
      ])
      .execute();

    const result = await getAccessLogs({
      user_id: users[0].id,
      action: 'view'
    });

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(users[0].id);
    expect(result[0].action).toEqual('view');
  });
});
