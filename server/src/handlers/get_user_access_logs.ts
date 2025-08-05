
import { db } from '../db';
import { accessLogsTable, archivesTable } from '../db/schema';
import { type AccessLog } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getUserAccessLogs(userId: number): Promise<AccessLog[]> {
  try {
    // Get access logs for the user with archive information
    const results = await db.select()
      .from(accessLogsTable)
      .innerJoin(archivesTable, eq(accessLogsTable.archive_id, archivesTable.id))
      .where(eq(accessLogsTable.user_id, userId))
      .orderBy(desc(accessLogsTable.created_at))
      .execute();

    // Transform the joined results back to AccessLog format
    return results.map(result => ({
      id: result.access_logs.id,
      user_id: result.access_logs.user_id,
      archive_id: result.access_logs.archive_id,
      action: result.access_logs.action,
      ip_address: result.access_logs.ip_address,
      user_agent: result.access_logs.user_agent,
      created_at: result.access_logs.created_at
    }));
  } catch (error) {
    console.error('Failed to fetch user access logs:', error);
    throw error;
  }
}
