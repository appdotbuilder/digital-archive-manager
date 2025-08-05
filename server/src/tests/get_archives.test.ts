
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { archivesTable, usersTable, categoriesTable } from '../db/schema';
import { type CreateArchiveInput, type CreateUserInput, type CreateCategoryInput } from '../schema';
import { getArchives } from '../handlers/get_archives';

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

const testArchive1: CreateArchiveInput = {
  title: 'Test Archive 1',
  description: 'First test archive',
  file_name: 'test1.pdf',
  file_path: '/uploads/test1.pdf',
  file_type: 'pdf',
  file_size: 1024,
  category_id: null,
  uploaded_by: 1
};

const testArchive2: CreateArchiveInput = {
  title: 'Test Archive 2',
  description: 'Second test archive',
  file_name: 'test2.jpg',
  file_path: '/uploads/test2.jpg',
  file_type: 'jpg',
  file_size: 2048,
  category_id: 1,
  uploaded_by: 1
};

describe('getArchives', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no archives exist', async () => {
    const result = await getArchives();
    expect(result).toEqual([]);
  });

  it('should return all archives', async () => {
    // Create prerequisite data
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

    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: testCategory.name,
        description: testCategory.description
      })
      .returning()
      .execute();

    // Create test archives
    await db.insert(archivesTable)
      .values([
        {
          title: testArchive1.title,
          description: testArchive1.description,
          file_name: testArchive1.file_name,
          file_path: testArchive1.file_path,
          file_type: testArchive1.file_type,
          file_size: testArchive1.file_size,
          category_id: testArchive1.category_id,
          uploaded_by: userResult[0].id
        },
        {
          title: testArchive2.title,
          description: testArchive2.description,
          file_name: testArchive2.file_name,
          file_path: testArchive2.file_path,
          file_type: testArchive2.file_type,
          file_size: testArchive2.file_size,
          category_id: categoryResult[0].id,
          uploaded_by: userResult[0].id
        }
      ])
      .execute();

    const result = await getArchives();

    expect(result).toHaveLength(2);
    
    // Verify first archive
    const archive1 = result.find(a => a.title === 'Test Archive 1');
    expect(archive1).toBeDefined();
    expect(archive1?.title).toEqual('Test Archive 1');
    expect(archive1?.description).toEqual('First test archive');
    expect(archive1?.file_name).toEqual('test1.pdf');
    expect(archive1?.file_type).toEqual('pdf');
    expect(archive1?.file_size).toEqual(1024);
    expect(archive1?.category_id).toBeNull();
    expect(archive1?.uploaded_by).toEqual(userResult[0].id);
    expect(archive1?.created_at).toBeInstanceOf(Date);
    expect(archive1?.updated_at).toBeInstanceOf(Date);

    // Verify second archive
    const archive2 = result.find(a => a.title === 'Test Archive 2');
    expect(archive2).toBeDefined();
    expect(archive2?.title).toEqual('Test Archive 2');
    expect(archive2?.description).toEqual('Second test archive');
    expect(archive2?.file_name).toEqual('test2.jpg');
    expect(archive2?.file_type).toEqual('jpg');
    expect(archive2?.file_size).toEqual(2048);
    expect(archive2?.category_id).toEqual(categoryResult[0].id);
    expect(archive2?.uploaded_by).toEqual(userResult[0].id);
    expect(archive2?.created_at).toBeInstanceOf(Date);
    expect(archive2?.updated_at).toBeInstanceOf(Date);
  });

  it('should return archives with correct data types', async () => {
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

    // Create test archive
    await db.insert(archivesTable)
      .values({
        title: testArchive1.title,
        description: testArchive1.description,
        file_name: testArchive1.file_name,
        file_path: testArchive1.file_path,
        file_type: testArchive1.file_type,
        file_size: testArchive1.file_size,
        category_id: testArchive1.category_id,
        uploaded_by: userResult[0].id
      })
      .execute();

    const result = await getArchives();

    expect(result).toHaveLength(1);
    const archive = result[0];

    // Verify data types
    expect(typeof archive.id).toBe('number');
    expect(typeof archive.title).toBe('string');
    expect(typeof archive.file_name).toBe('string');
    expect(typeof archive.file_path).toBe('string');
    expect(typeof archive.file_type).toBe('string');
    expect(typeof archive.file_size).toBe('number');
    expect(typeof archive.uploaded_by).toBe('number');
    expect(archive.created_at).toBeInstanceOf(Date);
    expect(archive.updated_at).toBeInstanceOf(Date);
    
    // category_id can be null or number
    expect(archive.category_id === null || typeof archive.category_id === 'number').toBe(true);
    
    // description can be null or string
    expect(archive.description === null || typeof archive.description === 'string').toBe(true);
  });
});
