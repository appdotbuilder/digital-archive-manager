
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { archivesTable, usersTable, categoriesTable } from '../db/schema';
import { type CreateArchiveInput } from '../schema';
import { createArchive } from '../handlers/create_archive';
import { eq } from 'drizzle-orm';

describe('createArchive', () => {
  let testUserId: number;
  let testCategoryId: number;

  beforeEach(async () => {
    await createDB();

    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User',
        role: 'user'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A category for testing'
      })
      .returning()
      .execute();
    testCategoryId = categoryResult[0].id;
  });

  afterEach(resetDB);

  it('should create an archive with all fields', async () => {
    const testInput: CreateArchiveInput = {
      title: 'Test Document',
      description: 'A test document for archiving',
      file_name: 'test.pdf',
      file_path: '/uploads/test.pdf',
      file_type: 'pdf',
      file_size: 1024,
      category_id: testCategoryId,
      uploaded_by: testUserId
    };

    const result = await createArchive(testInput);

    expect(result.title).toEqual('Test Document');
    expect(result.description).toEqual('A test document for archiving');
    expect(result.file_name).toEqual('test.pdf');
    expect(result.file_path).toEqual('/uploads/test.pdf');
    expect(result.file_type).toEqual('pdf');
    expect(result.file_size).toEqual(1024);
    expect(result.category_id).toEqual(testCategoryId);
    expect(result.uploaded_by).toEqual(testUserId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an archive without category', async () => {
    const testInput: CreateArchiveInput = {
      title: 'Uncategorized Document',
      description: 'A document without category',
      file_name: 'uncategorized.docx',
      file_path: '/uploads/uncategorized.docx',
      file_type: 'docx',
      file_size: 2048,
      category_id: null,
      uploaded_by: testUserId
    };

    const result = await createArchive(testInput);

    expect(result.title).toEqual('Uncategorized Document');
    expect(result.category_id).toBeNull();
    expect(result.uploaded_by).toEqual(testUserId);
    expect(result.id).toBeDefined();
  });

  it('should create an archive without description', async () => {
    const testInput: CreateArchiveInput = {
      title: 'No Description Document',
      file_name: 'simple.jpg',
      file_path: '/uploads/simple.jpg',
      file_type: 'jpg',
      file_size: 512,
      category_id: testCategoryId,
      uploaded_by: testUserId
    };

    const result = await createArchive(testInput);

    expect(result.title).toEqual('No Description Document');
    expect(result.description).toBeNull();
    expect(result.file_type).toEqual('jpg');
    expect(result.id).toBeDefined();
  });

  it('should save archive to database', async () => {
    const testInput: CreateArchiveInput = {
      title: 'Database Test Document',
      description: 'Testing database persistence',
      file_name: 'dbtest.png',
      file_path: '/uploads/dbtest.png',
      file_type: 'png',
      file_size: 768,
      category_id: testCategoryId,
      uploaded_by: testUserId
    };

    const result = await createArchive(testInput);

    const archives = await db.select()
      .from(archivesTable)
      .where(eq(archivesTable.id, result.id))
      .execute();

    expect(archives).toHaveLength(1);
    expect(archives[0].title).toEqual('Database Test Document');
    expect(archives[0].description).toEqual('Testing database persistence');
    expect(archives[0].file_name).toEqual('dbtest.png');
    expect(archives[0].file_path).toEqual('/uploads/dbtest.png');
    expect(archives[0].file_type).toEqual('png');
    expect(archives[0].file_size).toEqual(768);
    expect(archives[0].category_id).toEqual(testCategoryId);
    expect(archives[0].uploaded_by).toEqual(testUserId);
    expect(archives[0].created_at).toBeInstanceOf(Date);
    expect(archives[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when uploader user does not exist', async () => {
    const testInput: CreateArchiveInput = {
      title: 'Invalid User Document',
      file_name: 'invalid.pdf',
      file_path: '/uploads/invalid.pdf',
      file_type: 'pdf',
      file_size: 1024,
      category_id: testCategoryId,
      uploaded_by: 99999 // Non-existent user ID
    };

    expect(createArchive(testInput)).rejects.toThrow(/user with id 99999 does not exist/i);
  });

  it('should throw error when category does not exist', async () => {
    const testInput: CreateArchiveInput = {
      title: 'Invalid Category Document',
      file_name: 'invalid-cat.pdf',
      file_path: '/uploads/invalid-cat.pdf',
      file_type: 'pdf',
      file_size: 1024,
      category_id: 99999, // Non-existent category ID
      uploaded_by: testUserId
    };

    expect(createArchive(testInput)).rejects.toThrow(/category with id 99999 does not exist/i);
  });

  it('should handle different file types correctly', async () => {
    const fileTypes = ['pdf', 'docx', 'jpg', 'jpeg', 'png', 'gif', 'other'] as const;

    for (const fileType of fileTypes) {
      const testInput: CreateArchiveInput = {
        title: `${fileType.toUpperCase()} Document`,
        file_name: `test.${fileType}`,
        file_path: `/uploads/test.${fileType}`,
        file_type: fileType,
        file_size: 1024,
        category_id: testCategoryId,
        uploaded_by: testUserId
      };

      const result = await createArchive(testInput);
      expect(result.file_type).toEqual(fileType);
      expect(result.id).toBeDefined();
    }
  });
});
