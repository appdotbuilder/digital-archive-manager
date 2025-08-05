
import { db } from '../db';
import { archivesTable, categoriesTable } from '../db/schema';
import { type UpdateArchiveInput, type Archive } from '../schema';
import { eq } from 'drizzle-orm';

export const updateArchive = async (input: UpdateArchiveInput): Promise<Archive> => {
  try {
    // First, verify the archive exists
    const existingArchive = await db.select()
      .from(archivesTable)
      .where(eq(archivesTable.id, input.id))
      .execute();

    if (existingArchive.length === 0) {
      throw new Error(`Archive with id ${input.id} not found`);
    }

    // If category_id is being updated and is not null, verify the category exists
    if (input.category_id !== undefined && input.category_id !== null) {
      const existingCategory = await db.select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, input.category_id))
        .execute();

      if (existingCategory.length === 0) {
        throw new Error(`Category with id ${input.category_id} not found`);
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.category_id !== undefined) {
      updateData.category_id = input.category_id;
    }

    // Update the archive
    const result = await db.update(archivesTable)
      .set(updateData)
      .where(eq(archivesTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Archive update failed:', error);
    throw error;
  }
};
