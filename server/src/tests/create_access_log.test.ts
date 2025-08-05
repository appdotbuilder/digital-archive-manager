
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { accessLogsTable, usersTable, archivesTable, categoriesTable } from '../db/schema';
import { type CreateAccessLogInput } from '../schema';
import { createAccessLog } from '../handlers/create_access_log';
import { eq } from 'drizzle-orm';

describe('createAccessLog', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testArchiveId: number;

  beforeEach(async () => {
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
    testUserId = userResult[0].id;

    // Create test archive
    const archiveResult = await db.insert(archivesTable)
      .values({
        title: 'Test Archive',
        description: 'A test archive',
        file_name: 'test.pdf',
        file_path: '/uploads/test.pdf',
        file_type: 'pdf',
        file_size: 1024,
        uploaded_by: testUserId
      })
      .returning()
      .execute();
    testArchiveId = archiveResult[0].id;
  });

  const createTestInput = (overrides?: Partial<CreateAccessLogInput>): CreateAccessLogInput => ({
    user_id: testUserId,
    archive_id: testArchiveId,
    action: 'view',
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0 Test Browser',
    ...overrides
  });

  it('should create an access log with all fields', async () => {
    const input = createTestInput();
    const result = await createAccessLog(input);

    expect(result.user_id).toEqual(testUserId);
    expect(result.archive_id).toEqual(testArchiveId);
    expect(result.action).toEqual('view');
    expect(result.ip_address).toEqual('192.168.1.1');
    expect(result.user_agent).toEqual('Mozilla/5.0 Test Browser');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create an access log with minimal fields', async () => {
    const input = createTestInput({
      ip_address: null,
      user_agent: null
    });
    const result = await createAccessLog(input);

    expect(result.user_id).toEqual(testUserId);
    expect(result.archive_id).toEqual(testArchiveId);
    expect(result.action).toEqual('view');
    expect(result.ip_address).toBeNull();
    expect(result.user_agent).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save access log to database', async () => {
    const input = createTestInput();
    const result = await createAccessLog(input);

    const logs = await db.select()
      .from(accessLogsTable)
      .where(eq(accessLogsTable.id, result.id))
      .execute();

    expect(logs).toHaveLength(1);
    expect(logs[0].user_id).toEqual(testUserId);
    expect(logs[0].archive_id).toEqual(testArchiveId);
    expect(logs[0].action).toEqual('view');
    expect(logs[0].ip_address).toEqual('192.168.1.1');
    expect(logs[0].user_agent).toEqual('Mozilla/5.0 Test Browser');
  });

  it('should handle different action types', async () => {
    const actions = ['view', 'download', 'upload', 'delete'] as const;

    for (const action of actions) {
      const input = createTestInput({ action });
      const result = await createAccessLog(input);

      expect(result.action).toEqual(action);
    }
  });

  it('should throw error when user does not exist', async () => {
    const input = createTestInput({ user_id: 999999 });

    await expect(createAccessLog(input)).rejects.toThrow(/user with id 999999 does not exist/i);
  });

  it('should throw error when archive does not exist', async () => {
    const input = createTestInput({ archive_id: 999999 });

    await expect(createAccessLog(input)).rejects.toThrow(/archive with id 999999 does not exist/i);
  });

  it('should handle optional fields correctly', async () => {
    const input = createTestInput();
    delete (input as any).ip_address;
    delete (input as any).user_agent;

    const result = await createAccessLog(input);

    expect(result.ip_address).toBeNull();
    expect(result.user_agent).toBeNull();
    expect(result.user_id).toEqual(testUserId);
    expect(result.archive_id).toEqual(testArchiveId);
  });
});
