
import { db } from '../db';
import { accessLogsTable } from '../db/schema';
import { type AccessLog } from '../schema';
import { eq, gte, lte, and, desc, type SQL } from 'drizzle-orm';

export interface GetAccessLogsFilters {
  user_id?: number;
  archive_id?: number;
  action?: 'view' | 'download' | 'upload' | 'delete';
  start_date?: Date;
  end_date?: Date;
  limit?: number;
  offset?: number;
}

export async function getAccessLogs(filters: GetAccessLogsFilters = {}): Promise<AccessLog[]> {
  try {
    // Set default pagination values
    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;

    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    if (filters.user_id !== undefined) {
      conditions.push(eq(accessLogsTable.user_id, filters.user_id));
    }

    if (filters.archive_id !== undefined) {
      conditions.push(eq(accessLogsTable.archive_id, filters.archive_id));
    }

    if (filters.action !== undefined) {
      conditions.push(eq(accessLogsTable.action, filters.action));
    }

    if (filters.start_date !== undefined) {
      conditions.push(gte(accessLogsTable.created_at, filters.start_date));
    }

    if (filters.end_date !== undefined) {
      conditions.push(lte(accessLogsTable.created_at, filters.end_date));
    }

    // Build and execute the query based on whether we have conditions
    const results = conditions.length > 0
      ? await db.select()
          .from(accessLogsTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(desc(accessLogsTable.created_at))
          .limit(limit)
          .offset(offset)
          .execute()
      : await db.select()
          .from(accessLogsTable)
          .orderBy(desc(accessLogsTable.created_at))
          .limit(limit)
          .offset(offset)
          .execute();

    return results;
  } catch (error) {
    console.error('Failed to get access logs:', error);
    throw error;
  }
}
