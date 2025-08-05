
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type CreateCategoryInput } from '../schema';
import { createCategory } from '../handlers/create_category';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateCategoryInput = {
  name: 'Test Category',
  description: 'A category for testing purposes'
};

// Test input with minimal required fields
const minimalInput: CreateCategoryInput = {
  name: 'Minimal Category',
  description: null
};

describe('createCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a category with all fields', async () => {
    const result = await createCategory(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Category');
    expect(result.description).toEqual('A category for testing purposes');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a category with minimal fields', async () => {
    const result = await createCategory(minimalInput);

    expect(result.name).toEqual('Minimal Category');
    expect(result.description).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save category to database', async () => {
    const result = await createCategory(testInput);

    // Query database to verify category was saved
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toEqual('Test Category');
    expect(categories[0].description).toEqual('A category for testing purposes');
    expect(categories[0].created_at).toBeInstanceOf(Date);
    expect(categories[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle undefined description as null', async () => {
    const inputWithUndefinedDescription: CreateCategoryInput = {
      name: 'Category Without Description'
      // description is omitted (undefined)
    };

    const result = await createCategory(inputWithUndefinedDescription);

    expect(result.name).toEqual('Category Without Description');
    expect(result.description).toBeNull();

    // Verify in database
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories[0].description).toBeNull();
  });

  it('should enforce unique category names', async () => {
    // Create first category
    await createCategory(testInput);

    // Try to create another category with the same name
    await expect(createCategory(testInput))
      .rejects.toThrow(/unique constraint/i);
  });

  it('should create multiple categories with different names', async () => {
    const category1 = await createCategory({
      name: 'Category 1',
      description: 'First category'
    });

    const category2 = await createCategory({
      name: 'Category 2',
      description: 'Second category'
    });

    expect(category1.id).not.toEqual(category2.id);
    expect(category1.name).toEqual('Category 1');
    expect(category2.name).toEqual('Category 2');

    // Verify both exist in database
    const allCategories = await db.select()
      .from(categoriesTable)
      .execute();

    expect(allCategories).toHaveLength(2);
  });
});
