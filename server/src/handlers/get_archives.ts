
import { db } from '../db';
import { archivesTable } from '../db/schema';
import { type Archive } from '../schema';

export const getArchives = async (): Promise<Archive[]> => {
  try {
    const results = await db.select()
      .from(archivesTable)
      .execute();

    return results.map(archive => ({
      ...archive,
      // No numeric conversions needed - all fields are already correct types
      // file_size is integer, so no conversion needed
      category_id: archive.category_id, // nullable integer - no conversion needed
    }));
  } catch (error) {
    console.error('Get archives failed:', error);
    throw error;
  }
};
