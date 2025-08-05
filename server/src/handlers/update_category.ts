
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type UpdateCategoryInput, type Category } from '../schema';
import { eq } from 'drizzle-orm';

export const updateCategory = async (input: UpdateCategoryInput): Promise<Category> => {
  try {
    // Verify category exists
    const existingCategory = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, input.id))
      .execute();

    if (existingCategory.length === 0) {
      throw new Error(`Category with id ${input.id} not found`);
    }

    // Check for name uniqueness if name is being updated
    if (input.name) {
      const existingWithName = await db.select()
        .from(categoriesTable)
        .where(eq(categoriesTable.name, input.name))
        .execute();

      // If another category has this name (not the current one), throw error
      if (existingWithName.length > 0 && existingWithName[0].id !== input.id) {
        throw new Error(`Category with name "${input.name}" already exists`);
      }
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof categoriesTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    // Update category
    const result = await db.update(categoriesTable)
      .set(updateData)
      .where(eq(categoriesTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Category update failed:', error);
    throw error;
  }
};
