
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, archivesTable } from '../db/schema';
import { type SearchArchivesInput } from '../schema';
import { searchArchives } from '../handlers/search_archives';

describe('searchArchives', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup helper
  const setupTestData = async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'user'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Documents',
        description: 'Document category'
      })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create test archives
    await db.insert(archivesTable)
      .values([
        {
          title: 'Important Report',
          description: 'Annual financial report',
          file_name: 'report_2024.pdf',
          file_path: '/uploads/report_2024.pdf',
          file_type: 'pdf',
          file_size: 1024000,
          category_id: categoryId,
          uploaded_by: userId
        },
        {
          title: 'Meeting Notes',
          description: 'Weekly team meeting notes',
          file_name: 'meeting_notes.docx',
          file_path: '/uploads/meeting_notes.docx',
          file_type: 'docx',
          file_size: 512000,
          category_id: categoryId,
          uploaded_by: userId
        },
        {
          title: 'Project Image',
          description: 'Screenshot of project dashboard',
          file_name: 'dashboard.png',
          file_path: '/uploads/dashboard.png',
          file_type: 'png',
          file_size: 256000,
          category_id: null,
          uploaded_by: userId
        }
      ])
      .execute();

    return { userId, categoryId };
  };

  it('should return all archives when no filters applied', async () => {
    await setupTestData();

    const input: SearchArchivesInput = {
      limit: 20,
      offset: 0
    };

    const results = await searchArchives(input);

    expect(results).toHaveLength(3);
    expect(results[0].title).toBeDefined();
    expect(results[0].uploader.first_name).toEqual('John');
    expect(results[0].uploader.last_name).toEqual('Doe');
  });

  it('should search by query in title', async () => {
    await setupTestData();

    const input: SearchArchivesInput = {
      query: 'Important',
      limit: 20,
      offset: 0
    };

    const results = await searchArchives(input);

    expect(results).toHaveLength(1);
    expect(results[0].title).toEqual('Important Report');
  });

  it('should search by query in description', async () => {
    await setupTestData();

    const input: SearchArchivesInput = {
      query: 'financial',
      limit: 20,
      offset: 0
    };

    const results = await searchArchives(input);

    expect(results).toHaveLength(1);
    expect(results[0].title).toEqual('Important Report');
    expect(results[0].description).toEqual('Annual financial report');
  });

  it('should search by query in filename', async () => {
    await setupTestData();

    const input: SearchArchivesInput = {
      query: 'dashboard',
      limit: 20,
      offset: 0
    };

    const results = await searchArchives(input);

    expect(results).toHaveLength(1);
    expect(results[0].file_name).toEqual('dashboard.png');
  });

  it('should filter by category', async () => {
    const { categoryId } = await setupTestData();

    const input: SearchArchivesInput = {
      category_id: categoryId,
      limit: 20,
      offset: 0
    };

    const results = await searchArchives(input);

    expect(results).toHaveLength(2);
    results.forEach(result => {
      expect(result.category_id).toEqual(categoryId);
      expect(result.category).not.toBeNull();
      expect(result.category!.name).toEqual('Documents');
    });
  });

  it('should filter by file type', async () => {
    await setupTestData();

    const input: SearchArchivesInput = {
      file_type: 'pdf',
      limit: 20,
      offset: 0
    };

    const results = await searchArchives(input);

    expect(results).toHaveLength(1);
    expect(results[0].file_type).toEqual('pdf');
    expect(results[0].title).toEqual('Important Report');
  });

  it('should handle archives without category', async () => {
    await setupTestData();

    const input: SearchArchivesInput = {
      query: 'Project',
      limit: 20,
      offset: 0
    };

    const results = await searchArchives(input);

    expect(results).toHaveLength(1);
    expect(results[0].category_id).toBeNull();
    expect(results[0].category).toBeNull();
  });

  it('should combine multiple filters', async () => {
    const { categoryId } = await setupTestData();

    const input: SearchArchivesInput = {
      query: 'report',
      category_id: categoryId,
      file_type: 'pdf',
      limit: 20,
      offset: 0
    };

    const results = await searchArchives(input);

    expect(results).toHaveLength(1);
    expect(results[0].title).toEqual('Important Report');
    expect(results[0].category_id).toEqual(categoryId);
    expect(results[0].file_type).toEqual('pdf');
  });

  it('should support pagination', async () => {
    await setupTestData();

    // First page
    const firstPage: SearchArchivesInput = {
      limit: 2,
      offset: 0
    };

    const firstResults = await searchArchives(firstPage);
    expect(firstResults).toHaveLength(2);

    // Second page
    const secondPage: SearchArchivesInput = {
      limit: 2,
      offset: 2
    };

    const secondResults = await searchArchives(secondPage);
    expect(secondResults).toHaveLength(1);

    // Ensure different results
    const firstIds = firstResults.map(r => r.id);
    const secondIds = secondResults.map(r => r.id);
    expect(firstIds).not.toContain(secondIds[0]);
  });

  it('should return empty array when no matches found', async () => {
    await setupTestData();

    const input: SearchArchivesInput = {
      query: 'nonexistent',
      limit: 20,
      offset: 0
    };

    const results = await searchArchives(input);

    expect(results).toHaveLength(0);
  });

  it('should perform case-insensitive search', async () => {
    await setupTestData();

    const input: SearchArchivesInput = {
      query: 'IMPORTANT',
      limit: 20,
      offset: 0
    };

    const results = await searchArchives(input);

    expect(results).toHaveLength(1);
    expect(results[0].title).toEqual('Important Report');
  });
});
