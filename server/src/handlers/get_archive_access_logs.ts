
import { db } from '../db';
import { accessLogsTable, usersTable } from '../db/schema';
import { type AccessLog } from '../schema';
import { eq } from 'drizzle-orm';

export async function getArchiveAccessLogs(archiveId: number): Promise<AccessLog[]> {
  try {
    const result = await db.select({
      id: accessLogsTable.id,
      user_id: accessLogsTable.user_id,
      archive_id: accessLogsTable.archive_id,
      action: accessLogsTable.action,
      ip_address: accessLogsTable.ip_address,
      user_agent: accessLogsTable.user_agent,
      created_at: accessLogsTable.created_at
    })
    .from(accessLogsTable)
    .where(eq(accessLogsTable.archive_id, archiveId))
    .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch archive access logs:', error);
    throw error;
  }
}
