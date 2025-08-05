
import { db } from '../db';
import { archivesTable, accessLogsTable } from '../db/schema';
import { type Archive } from '../schema';
import { eq } from 'drizzle-orm';

export const deleteArchive = async (archiveId: number): Promise<Archive> => {
  try {
    // First, check if the archive exists and get its data
    const existingArchives = await db.select()
      .from(archivesTable)
      .where(eq(archivesTable.id, archiveId))
      .execute();

    if (existingArchives.length === 0) {
      throw new Error(`Archive with id ${archiveId} not found`);
    }

    const archive = existingArchives[0];

    // Delete related access logs first (foreign key constraint)
    await db.delete(accessLogsTable)
      .where(eq(accessLogsTable.archive_id, archiveId))
      .execute();

    // Delete the archive record
    await db.delete(archivesTable)
      .where(eq(archivesTable.id, archiveId))
      .execute();

    // Return the deleted archive data
    return {
      ...archive,
      // Ensure dates are Date objects
      created_at: new Date(archive.created_at),
      updated_at: new Date(archive.updated_at)
    };
  } catch (error) {
    console.error('Archive deletion failed:', error);
    throw error;
  }
};
