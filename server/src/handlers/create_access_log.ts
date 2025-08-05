
import { db } from '../db';
import { accessLogsTable, usersTable, archivesTable } from '../db/schema';
import { type CreateAccessLogInput, type AccessLog } from '../schema';
import { eq } from 'drizzle-orm';

export const createAccessLog = async (input: CreateAccessLogInput): Promise<AccessLog> => {
  try {
    // Validate that the user exists
    const userExists = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (userExists.length === 0) {
      throw new Error(`User with ID ${input.user_id} does not exist`);
    }

    // Validate that the archive exists
    const archiveExists = await db.select({ id: archivesTable.id })
      .from(archivesTable)
      .where(eq(archivesTable.id, input.archive_id))
      .execute();

    if (archiveExists.length === 0) {
      throw new Error(`Archive with ID ${input.archive_id} does not exist`);
    }

    // Insert access log record
    const result = await db.insert(accessLogsTable)
      .values({
        user_id: input.user_id,
        archive_id: input.archive_id,
        action: input.action,
        ip_address: input.ip_address || null,
        user_agent: input.user_agent || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Access log creation failed:', error);
    throw error;
  }
};
