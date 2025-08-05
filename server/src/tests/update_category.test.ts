
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type UpdateCategoryInput, type CreateCategoryInput } from '../schema';
import { updateCategory } from '../handlers/update_category';
import { eq } from 'drizzle-orm';

// Helper to create test category
const createTestCategory = async (name: string = 'Test Category', description: string | null = 'Test description') => {
  const result = await db.insert(categoriesTable)
    .values({
      name,
      description
    })
    .returning()
    .execute();
  return result[0];
};

describe('updateCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update category name', async () => {
    const category = await createTestCategory();
    
    const updateInput: UpdateCategoryInput = {
      id: category.id,
      name: 'Updated Category Name'
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual('Updated Category Name');
    expect(result.description).toEqual(category.description);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > category.updated_at).toBe(true);
  });

  it('should update category description', async () => {
    const category = await createTestCategory();
    
    const updateInput: UpdateCategoryInput = {
      id: category.id,
      description: 'Updated description'
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual(category.name);
    expect(result.description).toEqual('Updated description');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update both name and description', async () => {
    const category = await createTestCategory();
    
    const updateInput: UpdateCategoryInput = {
      id: category.id,
      name: 'New Name',
      description: 'New description'
    };

    const result = await updateCategory(updateInput);

    expect(result.name).toEqual('New Name');
    expect(result.description).toEqual('New description');
    expect(result.updated_at > category.updated_at).toBe(true);
  });

  it('should set description to null', async () => {
    const category = await createTestCategory();
    
    const updateInput: UpdateCategoryInput = {
      id: category.id,
      description: null
    };

    const result = await updateCategory(updateInput);

    expect(result.description).toBeNull();
    expect(result.name).toEqual(category.name);
  });

  it('should persist changes to database', async () => {
    const category = await createTestCategory();
    
    const updateInput: UpdateCategoryInput = {
      id: category.id,
      name: 'Database Updated Name'
    };

    await updateCategory(updateInput);

    const updatedInDb = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, category.id))
      .execute();

    expect(updatedInDb).toHaveLength(1);
    expect(updatedInDb[0].name).toEqual('Database Updated Name');
    expect(updatedInDb[0].updated_at).toBeInstanceOf(Date);
    expect(updatedInDb[0].updated_at > category.updated_at).toBe(true);
  });

  it('should throw error when category does not exist', async () => {
    const updateInput: UpdateCategoryInput = {
      id: 999,
      name: 'Non-existent Category'
    };

    expect(updateCategory(updateInput)).rejects.toThrow(/Category with id 999 not found/i);
  });

  it('should throw error when name already exists for different category', async () => {
    const category1 = await createTestCategory('First Category');
    const category2 = await createTestCategory('Second Category');
    
    const updateInput: UpdateCategoryInput = {
      id: category2.id,
      name: 'First Category' // This name already exists
    };

    expect(updateCategory(updateInput)).rejects.toThrow(/Category with name "First Category" already exists/i);
  });

  it('should allow updating category with same name', async () => {
    const category = await createTestCategory('Same Name');
    
    const updateInput: UpdateCategoryInput = {
      id: category.id,
      name: 'Same Name', // Same name should be allowed
      description: 'Updated description'
    };

    const result = await updateCategory(updateInput);

    expect(result.name).toEqual('Same Name');
    expect(result.description).toEqual('Updated description');
  });

  it('should handle partial updates correctly', async () => {
    const category = await createTestCategory('Original Name', 'Original description');
    
    // Update only name
    const updateInput1: UpdateCategoryInput = {
      id: category.id,
      name: 'New Name Only'
    };

    const result1 = await updateCategory(updateInput1);
    expect(result1.name).toEqual('New Name Only');
    expect(result1.description).toEqual('Original description');

    // Update only description
    const updateInput2: UpdateCategoryInput = {
      id: category.id,
      description: 'New description only'
    };

    const result2 = await updateCategory(updateInput2);
    expect(result2.name).toEqual('New Name Only');
    expect(result2.description).toEqual('New description only');
  });
});
