
import { db } from '../db';
import { archivesTable, categoriesTable, usersTable } from '../db/schema';
import { type ArchiveWithDetails } from '../schema';
import { eq } from 'drizzle-orm';

export async function getArchiveById(archiveId: number): Promise<ArchiveWithDetails | null> {
  try {
    const result = await db.select({
      // Archive fields
      id: archivesTable.id,
      title: archivesTable.title,
      description: archivesTable.description,
      file_name: archivesTable.file_name,
      file_path: archivesTable.file_path,
      file_type: archivesTable.file_type,
      file_size: archivesTable.file_size,
      category_id: archivesTable.category_id,
      uploaded_by: archivesTable.uploaded_by,
      created_at: archivesTable.created_at,
      updated_at: archivesTable.updated_at,
      // Category fields (nullable)
      category_id_ref: categoriesTable.id,
      category_name: categoriesTable.name,
      category_description: categoriesTable.description,
      category_created_at: categoriesTable.created_at,
      category_updated_at: categoriesTable.updated_at,
      // Uploader fields
      uploader_id: usersTable.id,
      uploader_first_name: usersTable.first_name,
      uploader_last_name: usersTable.last_name
    })
    .from(archivesTable)
    .leftJoin(categoriesTable, eq(archivesTable.category_id, categoriesTable.id))
    .innerJoin(usersTable, eq(archivesTable.uploaded_by, usersTable.id))
    .where(eq(archivesTable.id, archiveId))
    .execute();

    if (result.length === 0) {
      return null;
    }

    const row = result[0];

    // Handle nullable category
    const category = row.category_id_ref !== null ? {
      id: row.category_id_ref,
      name: row.category_name!,
      description: row.category_description,
      created_at: row.category_created_at!,
      updated_at: row.category_updated_at!
    } : null;

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      file_name: row.file_name,
      file_path: row.file_path,
      file_type: row.file_type,
      file_size: row.file_size,
      category_id: row.category_id,
      uploaded_by: row.uploaded_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      category,
      uploader: {
        id: row.uploader_id,
        first_name: row.uploader_first_name,
        last_name: row.uploader_last_name
      }
    };
  } catch (error) {
    console.error('Failed to get archive by ID:', error);
    throw error;
  }
}
