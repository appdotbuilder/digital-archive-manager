
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, archivesTable } from '../db/schema';
import { getArchiveById } from '../handlers/get_archive_by_id';
import { type CreateUserInput, type CreateCategoryInput, type CreateArchiveInput } from '../schema';

// Test data
const testUser: CreateUserInput = {
  email: 'testuser@example.com',
  password: 'password123',
  first_name: 'Test',
  last_name: 'User',
  role: 'user'
};

const testCategory: CreateCategoryInput = {
  name: 'Test Category',
  description: 'A category for testing'
};

const testArchive: CreateArchiveInput = {
  title: 'Test Archive',
  description: 'An archive for testing',
  file_name: 'test.pdf',
  file_path: '/uploads/test.pdf',
  file_type: 'pdf',
  file_size: 1024,
  category_id: 1,
  uploaded_by: 1
};

describe('getArchiveById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return archive with category and uploader details', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password_123',
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

    // Create archive
    const archiveResult = await db.insert(archivesTable)
      .values({
        ...testArchive,
        category_id: categoryId,
        uploaded_by: userId
      })
      .returning()
      .execute();
    const archiveId = archiveResult[0].id;

    // Test the handler
    const result = await getArchiveById(archiveId);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(archiveId);
    expect(result!.title).toEqual('Test Archive');
    expect(result!.description).toEqual('An archive for testing');
    expect(result!.file_name).toEqual('test.pdf');
    expect(result!.file_path).toEqual('/uploads/test.pdf');
    expect(result!.file_type).toEqual('pdf');
    expect(result!.file_size).toEqual(1024);
    expect(result!.category_id).toEqual(categoryId);
    expect(result!.uploaded_by).toEqual(userId);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);

    // Check category details
    expect(result!.category).not.toBeNull();
    expect(result!.category!.id).toEqual(categoryId);
    expect(result!.category!.name).toEqual('Test Category');
    expect(result!.category!.description).toEqual('A category for testing');

    // Check uploader details
    expect(result!.uploader.id).toEqual(userId);
    expect(result!.uploader.first_name).toEqual('Test');
    expect(result!.uploader.last_name).toEqual('User');
  });

  it('should return archive with null category when no category assigned', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password_123',
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        role: testUser.role
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create archive without category
    const archiveResult = await db.insert(archivesTable)
      .values({
        ...testArchive,
        category_id: null,
        uploaded_by: userId
      })
      .returning()
      .execute();
    const archiveId = archiveResult[0].id;

    // Test the handler
    const result = await getArchiveById(archiveId);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(archiveId);
    expect(result!.category).toBeNull();
    expect(result!.category_id).toBeNull();

    // Uploader should still be present
    expect(result!.uploader.id).toEqual(userId);
    expect(result!.uploader.first_name).toEqual('Test');
    expect(result!.uploader.last_name).toEqual('User');
  });

  it('should return null when archive does not exist', async () => {
    const result = await getArchiveById(999);
    expect(result).toBeNull();
  });

  it('should handle different file types correctly', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password_123',
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        role: testUser.role
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create archive with different file type
    const archiveResult = await db.insert(archivesTable)
      .values({
        ...testArchive,
        file_name: 'image.jpg',
        file_path: '/uploads/image.jpg',
        file_type: 'jpg',
        category_id: null,
        uploaded_by: userId
      })
      .returning()
      .execute();
    const archiveId = archiveResult[0].id;

    // Test the handler
    const result = await getArchiveById(archiveId);

    expect(result).not.toBeNull();
    expect(result!.file_type).toEqual('jpg');
    expect(result!.file_name).toEqual('image.jpg');
    expect(result!.file_path).toEqual('/uploads/image.jpg');
  });
});
