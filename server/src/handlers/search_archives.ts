
import { db } from '../db';
import { archivesTable, categoriesTable, usersTable } from '../db/schema';
import { type SearchArchivesInput, type ArchiveWithDetails } from '../schema';
import { eq, and, or, ilike, type SQL } from 'drizzle-orm';

export async function searchArchives(input: SearchArchivesInput): Promise<ArchiveWithDetails[]> {
  try {
    // Build conditions array first
    const conditions: SQL<unknown>[] = [];

    // Full-text search across title, description, and filename
    if (input.query) {
      const searchPattern = `%${input.query}%`;
      conditions.push(
        or(
          ilike(archivesTable.title, searchPattern),
          ilike(archivesTable.description, searchPattern),
          ilike(archivesTable.file_name, searchPattern)
        )!
      );
    }

    // Filter by category
    if (input.category_id !== undefined) {
      conditions.push(eq(archivesTable.category_id, input.category_id));
    }

    // Filter by file type
    if (input.file_type) {
      conditions.push(eq(archivesTable.file_type, input.file_type));
    }

    // Build the query with or without where clause
    let results;
    
    if (conditions.length > 0) {
      results = await db.select({
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
        category: {
          id: categoriesTable.id,
          name: categoriesTable.name,
          description: categoriesTable.description,
          created_at: categoriesTable.created_at,
          updated_at: categoriesTable.updated_at
        },
        // Uploader fields
        uploader: {
          id: usersTable.id,
          first_name: usersTable.first_name,
          last_name: usersTable.last_name
        }
      })
      .from(archivesTable)
      .leftJoin(categoriesTable, eq(archivesTable.category_id, categoriesTable.id))
      .innerJoin(usersTable, eq(archivesTable.uploaded_by, usersTable.id))
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .limit(input.limit)
      .offset(input.offset)
      .execute();
    } else {
      results = await db.select({
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
        category: {
          id: categoriesTable.id,
          name: categoriesTable.name,
          description: categoriesTable.description,
          created_at: categoriesTable.created_at,
          updated_at: categoriesTable.updated_at
        },
        // Uploader fields
        uploader: {
          id: usersTable.id,
          first_name: usersTable.first_name,
          last_name: usersTable.last_name
        }
      })
      .from(archivesTable)
      .leftJoin(categoriesTable, eq(archivesTable.category_id, categoriesTable.id))
      .innerJoin(usersTable, eq(archivesTable.uploaded_by, usersTable.id))
      .limit(input.limit)
      .offset(input.offset)
      .execute();
    }

    // Transform results to match ArchiveWithDetails schema
    return results.map(result => ({
      id: result.id,
      title: result.title,
      description: result.description,
      file_name: result.file_name,
      file_path: result.file_path,
      file_type: result.file_type,
      file_size: result.file_size,
      category_id: result.category_id,
      uploaded_by: result.uploaded_by,
      created_at: result.created_at,
      updated_at: result.updated_at,
      category: result.category && result.category.id ? result.category : null,
      uploader: result.uploader
    }));
  } catch (error) {
    console.error('Archive search failed:', error);
    throw error;
  }
}
