
import { db } from '../db';
import { archivesTable, usersTable, categoriesTable } from '../db/schema';
import { type CreateArchiveInput, type Archive } from '../schema';
import { eq } from 'drizzle-orm';

export const createArchive = async (input: CreateArchiveInput): Promise<Archive> => {
  try {
    // Validate that the uploader user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.uploaded_by))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.uploaded_by} does not exist`);
    }

    // Validate that category exists if category_id is provided
    if (input.category_id !== null && input.category_id !== undefined) {
      const category = await db.select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, input.category_id))
        .execute();

      if (category.length === 0) {
        throw new Error(`Category with id ${input.category_id} does not exist`);
      }
    }

    // Insert archive record
    const result = await db.insert(archivesTable)
      .values({
        title: input.title,
        description: input.description || null,
        file_name: input.file_name,
        file_path: input.file_path,
        file_type: input.file_type,
        file_size: input.file_size,
        category_id: input.category_id || null,
        uploaded_by: input.uploaded_by
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Archive creation failed:', error);
    throw error;
  }
};
