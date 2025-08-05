
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, archivesTable, accessLogsTable } from '../db/schema';
import { type CreateUserInput, type CreateCategoryInput, type CreateArchiveInput, type CreateAccessLogInput } from '../schema';
import { deleteArchive } from '../handlers/delete_archive';
import { eq } from 'drizzle-orm';

// Test data
const testUser: CreateUserInput = {
  email: 'test@example.com',
  password: 'password123',
  first_name: 'Test',
  last_name: 'User',
  role: 'user'
};

const testCategory: CreateCategoryInput = {
  name: 'Test Category',
  description: 'A test category'
};

const testArchive: CreateArchiveInput = {
  title: 'Test Archive',
  description: 'A test archive file',
  file_name: 'test.pdf',
  file_path: '/uploads/test.pdf',
  file_type: 'pdf',
  file_size: 1024,
  category_id: null,
  uploaded_by: 1
};

describe('deleteArchive', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing archive', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        role: testUser.role
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create archive
    const archiveResult = await db.insert(archivesTable)
      .values({
        ...testArchive,
        uploaded_by: userId
      })
      .returning()
      .execute();

    const archiveId = archiveResult[0].id;

    // Delete the archive
    const deletedArchive = await deleteArchive(archiveId);

    // Verify return value
    expect(deletedArchive.id).toBe(archiveId);
    expect(deletedArchive.title).toBe(testArchive.title);
    expect(deletedArchive.file_name).toBe(testArchive.file_name);
    expect(deletedArchive.file_path).toBe(testArchive.file_path);
    expect(deletedArchive.file_type).toBe(testArchive.file_type);
    expect(deletedArchive.file_size).toBe(testArchive.file_size);
    expect(deletedArchive.uploaded_by).toBe(userId);
    expect(deletedArchive.created_at).toBeInstanceOf(Date);
    expect(deletedArchive.updated_at).toBeInstanceOf(Date);

    // Verify archive is deleted from database
    const remainingArchives = await db.select()
      .from(archivesTable)
      .where(eq(archivesTable.id, archiveId))
      .execute();

    expect(remainingArchives).toHaveLength(0);
  });

  it('should delete related access logs when deleting archive', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        role: testUser.role
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create archive
    const archiveResult = await db.insert(archivesTable)
      .values({
        ...testArchive,
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
          user_agent: 'Test Browser'
        },
        {
          user_id: userId,
          archive_id: archiveId,
          action: 'download',
          ip_address: '192.168.1.1',
          user_agent: 'Test Browser'
        }
      ])
      .execute();

    // Verify access logs exist before deletion
    const accessLogsBefore = await db.select()
      .from(accessLogsTable)
      .where(eq(accessLogsTable.archive_id, archiveId))
      .execute();

    expect(accessLogsBefore).toHaveLength(2);

    // Delete the archive
    await deleteArchive(archiveId);

    // Verify access logs are also deleted
    const accessLogsAfter = await db.select()
      .from(accessLogsTable)
      .where(eq(accessLogsTable.archive_id, archiveId))
      .execute();

    expect(accessLogsAfter).toHaveLength(0);
  });

  it('should throw error when archive does not exist', async () => {
    const nonExistentId = 999;

    await expect(deleteArchive(nonExistentId))
      .rejects
      .toThrow(/Archive with id 999 not found/i);
  });

  it('should handle archive with category reference', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        role: testUser.role
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create category
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create archive with category
    const archiveResult = await db.insert(archivesTable)
      .values({
        ...testArchive,
        uploaded_by: userId,
        category_id: categoryId
      })
      .returning()
      .execute();

    const archiveId = archiveResult[0].id;

    // Delete the archive
    const deletedArchive = await deleteArchive(archiveId);

    // Verify archive is deleted
    expect(deletedArchive.id).toBe(archiveId);
    expect(deletedArchive.category_id).toBe(categoryId);

    const remainingArchives = await db.select()
      .from(archivesTable)
      .where(eq(archivesTable.id, archiveId))
      .execute();

    expect(remainingArchives).toHaveLength(0);

    // Verify category still exists (shouldn't be deleted)
    const remainingCategories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(remainingCategories).toHaveLength(1);
  });
});
