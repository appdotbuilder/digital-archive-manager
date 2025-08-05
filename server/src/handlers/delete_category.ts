
import { db } from '../db';
import { categoriesTable, archivesTable } from '../db/schema';
import { type Category } from '../schema';
import { eq } from 'drizzle-orm';

export const deleteCategory = async (categoryId: number): Promise<Category> => {
  try {
    // First, verify the category exists and get its data
    const existingCategories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    if (existingCategories.length === 0) {
      throw new Error(`Category with id ${categoryId} not found`);
    }

    const category = existingCategories[0];

    // Update all archives that belong to this category to have null category_id
    await db.update(archivesTable)
      .set({ category_id: null })
      .where(eq(archivesTable.category_id, categoryId))
      .execute();

    // Delete the category
    await db.delete(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    return category;
  } catch (error) {
    console.error('Category deletion failed:', error);
    throw error;
  }
};
