
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type CreateCategoryInput } from '../schema';
import { getCategories } from '../handlers/get_categories';

describe('getCategories', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no categories exist', async () => {
    const result = await getCategories();
    expect(result).toEqual([]);
  });

  it('should return all categories', async () => {
    // Create test categories
    await db.insert(categoriesTable)
      .values([
        {
          name: 'Documents',
          description: 'Document files'
        },
        {
          name: 'Images',
          description: 'Image files'
        }
      ])
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('Documents');
    expect(result[0].description).toEqual('Document files');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    expect(result[1].name).toEqual('Images');
    expect(result[1].description).toEqual('Image files');
  });

  it('should return categories sorted by name', async () => {
    // Create categories in reverse alphabetical order
    await db.insert(categoriesTable)
      .values([
        {
          name: 'Videos',
          description: 'Video files'
        },
        {
          name: 'Audio',
          description: 'Audio files'
        },
        {
          name: 'Documents',
          description: 'Document files'
        }
      ])
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(3);
    // Should be sorted alphabetically by name
    expect(result[0].name).toEqual('Audio');
    expect(result[1].name).toEqual('Documents');
    expect(result[2].name).toEqual('Videos');
  });

  it('should handle categories with null descriptions', async () => {
    await db.insert(categoriesTable)
      .values({
        name: 'Miscellaneous',
        description: null
      })
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Miscellaneous');
    expect(result[0].description).toBeNull();
  });
});
