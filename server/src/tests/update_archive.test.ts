
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { archivesTable, categoriesTable, usersTable } from '../db/schema';
import { type UpdateArchiveInput, type CreateUserInput, type CreateCategoryInput, type CreateArchiveInput } from '../schema';
import { updateArchive } from '../handlers/update_archive';
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
  description: 'A category for testing'
};

const testArchive: CreateArchiveInput = {
  title: 'Original Archive',
  description: 'Original description',
  file_name: 'test.pdf',
  file_path: '/uploads/test.pdf',
  file_type: 'pdf',
  file_size: 1024,
  category_id: null,
  uploaded_by: 1
};

describe('updateArchive', () => {
  let userId: number;
  let categoryId: number;
  let archiveId: number;

  beforeEach(async () => {
    await createDB();

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
    userId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: testCategory.name,
        description: testCategory.description ?? null
      })
      .returning()
      .execute();
    categoryId = categoryResult[0].id;

    // Create test archive
    const archiveResult = await db.insert(archivesTable)
      .values({
        title: testArchive.title,
        description: testArchive.description ?? null,
        file_name: testArchive.file_name,
        file_path: testArchive.file_path,
        file_type: testArchive.file_type,
        file_size: testArchive.file_size,
        category_id: testArchive.category_id,
        uploaded_by: userId
      })
      .returning()
      .execute();
    archiveId = archiveResult[0].id;
  });

  afterEach(resetDB);

  it('should update archive title', async () => {
    const input: UpdateArchiveInput = {
      id: archiveId,
      title: 'Updated Archive Title'
    };

    const result = await updateArchive(input);

    expect(result.id).toEqual(archiveId);
    expect(result.title).toEqual('Updated Archive Title');
    expect(result.description).toEqual('Original description');
    expect(result.category_id).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update archive description', async () => {
    const input: UpdateArchiveInput = {
      id: archiveId,
      description: 'Updated description'
    };

    const result = await updateArchive(input);

    expect(result.title).toEqual('Original Archive');
    expect(result.description).toEqual('Updated description');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update archive category', async () => {
    const input: UpdateArchiveInput = {
      id: archiveId,
      category_id: categoryId
    };

    const result = await updateArchive(input);

    expect(result.category_id).toEqual(categoryId);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should set category to null', async () => {
    // First set a category
    await updateArchive({
      id: archiveId,
      category_id: categoryId
    });

    // Then set it to null
    const input: UpdateArchiveInput = {
      id: archiveId,
      category_id: null
    };

    const result = await updateArchive(input);

    expect(result.category_id).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    const input: UpdateArchiveInput = {
      id: archiveId,
      title: 'Multi-update Title',
      description: 'Multi-update description',
      category_id: categoryId
    };

    const result = await updateArchive(input);

    expect(result.title).toEqual('Multi-update Title');
    expect(result.description).toEqual('Multi-update description');
    expect(result.category_id).toEqual(categoryId);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save changes to database', async () => {
    const input: UpdateArchiveInput = {
      id: archiveId,
      title: 'Database Update Test',
      description: 'Testing database persistence'
    };

    await updateArchive(input);

    const archives = await db.select()
      .from(archivesTable)
      .where(eq(archivesTable.id, archiveId))
      .execute();

    expect(archives).toHaveLength(1);
    expect(archives[0].title).toEqual('Database Update Test');
    expect(archives[0].description).toEqual('Testing database persistence');
    expect(archives[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent archive', async () => {
    const input: UpdateArchiveInput = {
      id: 99999,
      title: 'This should fail'
    };

    await expect(updateArchive(input)).rejects.toThrow(/Archive with id 99999 not found/i);
  });

  it('should throw error for non-existent category', async () => {
    const input: UpdateArchiveInput = {
      id: archiveId,
      category_id: 99999
    };

    await expect(updateArchive(input)).rejects.toThrow(/Category with id 99999 not found/i);
  });

  it('should preserve unchanged fields', async () => {
    const input: UpdateArchiveInput = {
      id: archiveId,
      title: 'Only Title Changed'
    };

    const result = await updateArchive(input);

    // Check that other fields remain unchanged
    expect(result.description).toEqual('Original description');
    expect(result.file_name).toEqual('test.pdf');
    expect(result.file_path).toEqual('/uploads/test.pdf');
    expect(result.file_type).toEqual('pdf');
    expect(result.file_size).toEqual(1024);
    expect(result.uploaded_by).toEqual(userId);
  });
});
