
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, archivesTable, usersTable } from '../db/schema';
import { type CreateCategoryInput, type CreateUserInput, type CreateArchiveInput } from '../schema';
import { deleteCategory } from '../handlers/delete_category';
import { eq } from 'drizzle-orm';

// Test data
const testCategory: CreateCategoryInput = {
  name: 'Test Category',
  description: 'A category for testing'
};

const testUser: CreateUserInput = {
  email: 'test@example.com',
  password: 'password123',
  first_name: 'Test',
  last_name: 'User',
  role: 'user'
};

describe('deleteCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing category', async () => {
    // Create test category
    const createdCategories = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    const categoryId = createdCategories[0].id;

    // Delete the category
    const result = await deleteCategory(categoryId);

    // Verify returned data
    expect(result.id).toEqual(categoryId);
    expect(result.name).toEqual('Test Category');
    expect(result.description).toEqual('A category for testing');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify category was deleted from database
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(categories).toHaveLength(0);
  });

  it('should set category_id to null for archives belonging to deleted category', async () => {
    // Create test user first
    const createdUsers = await db.insert(usersTable)
      .values({
        ...testUser,
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();
    const userId = createdUsers[0].id;

    // Create test category
    const createdCategories = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    const categoryId = createdCategories[0].id;

    // Create test archive with this category
    const testArchive: CreateArchiveInput = {
      title: 'Test Archive',
      description: 'An archive for testing',
      file_name: 'test.pdf',
      file_path: '/path/to/test.pdf',
      file_type: 'pdf',
      file_size: 1024,
      category_id: categoryId,
      uploaded_by: userId
    };

    const createdArchives = await db.insert(archivesTable)
      .values(testArchive)
      .returning()
      .execute();
    const archiveId = createdArchives[0].id;

    // Delete the category
    await deleteCategory(categoryId);

    // Verify archive's category_id was set to null
    const archives = await db.select()
      .from(archivesTable)
      .where(eq(archivesTable.id, archiveId))
      .execute();

    expect(archives).toHaveLength(1);
    expect(archives[0].category_id).toBeNull();
    expect(archives[0].title).toEqual('Test Archive');
  });

  it('should handle multiple archives belonging to deleted category', async () => {
    // Create test user first
    const createdUsers = await db.insert(usersTable)
      .values({
        ...testUser,
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();
    const userId = createdUsers[0].id;

    // Create test category
    const createdCategories = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    const categoryId = createdCategories[0].id;

    // Create multiple archives with this category
    const archive1: CreateArchiveInput = {
      title: 'Archive 1',
      description: 'First archive',
      file_name: 'archive1.pdf',
      file_path: '/path/to/archive1.pdf',
      file_type: 'pdf',
      file_size: 1024,
      category_id: categoryId,
      uploaded_by: userId
    };

    const archive2: CreateArchiveInput = {
      title: 'Archive 2',
      description: 'Second archive',
      file_name: 'archive2.docx',
      file_path: '/path/to/archive2.docx',
      file_type: 'docx',
      file_size: 2048,
      category_id: categoryId,
      uploaded_by: userId
    };

    await db.insert(archivesTable)
      .values([archive1, archive2])
      .execute();

    // Delete the category
    await deleteCategory(categoryId);

    // Verify all archives have category_id set to null
    const archives = await db.select()
      .from(archivesTable)
      .where(eq(archivesTable.uploaded_by, userId))
      .execute();

    expect(archives).toHaveLength(2);
    archives.forEach(archive => {
      expect(archive.category_id).toBeNull();
    });
  });

  it('should throw error when category does not exist', async () => {
    const nonExistentId = 999;

    await expect(deleteCategory(nonExistentId)).rejects.toThrow(/Category with id 999 not found/i);
  });

  it('should not affect archives with different category_id', async () => {
    // Create test user first
    const createdUsers = await db.insert(usersTable)
      .values({
        ...testUser,
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();
    const userId = createdUsers[0].id;

    // Create two categories
    const category1 = await db.insert(categoriesTable)
      .values({ name: 'Category 1', description: 'First category' })
      .returning()
      .execute();
    const category1Id = category1[0].id;

    const category2 = await db.insert(categoriesTable)
      .values({ name: 'Category 2', description: 'Second category' })
      .returning()
      .execute();
    const category2Id = category2[0].id;

    // Create archives in both categories
    const archiveInCategory1: CreateArchiveInput = {
      title: 'Archive in Category 1',
      description: 'Archive belonging to category 1',
      file_name: 'archive1.pdf',
      file_path: '/path/to/archive1.pdf',
      file_type: 'pdf',
      file_size: 1024,
      category_id: category1Id,
      uploaded_by: userId
    };

    const archiveInCategory2: CreateArchiveInput = {
      title: 'Archive in Category 2',
      description: 'Archive belonging to category 2',
      file_name: 'archive2.pdf',
      file_path: '/path/to/archive2.pdf',
      file_type: 'pdf',
      file_size: 2048,
      category_id: category2Id,
      uploaded_by: userId
    };

    const createdArchives = await db.insert(archivesTable)
      .values([archiveInCategory1, archiveInCategory2])
      .returning()
      .execute();

    // Delete category 1
    await deleteCategory(category1Id);

    // Verify archive in category 1 has null category_id
    const category1Archive = await db.select()
      .from(archivesTable)
      .where(eq(archivesTable.id, createdArchives[0].id))
      .execute();

    expect(category1Archive[0].category_id).toBeNull();

    // Verify archive in category 2 still has its category_id
    const category2Archive = await db.select()
      .from(archivesTable)
      .where(eq(archivesTable.id, createdArchives[1].id))
      .execute();

    expect(category2Archive[0].category_id).toEqual(category2Id);
  });
});
