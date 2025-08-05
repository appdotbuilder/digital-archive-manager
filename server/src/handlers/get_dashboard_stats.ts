
import { db } from '../db';
import { usersTable, archivesTable, categoriesTable, accessLogsTable } from '../db/schema';
import { type DashboardStats } from '../schema';
import { count, sum, gte } from 'drizzle-orm';

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Calculate date 30 days ago for recent activity
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get total counts
    const [totalUsersResult] = await db.select({ count: count() }).from(usersTable).execute();
    const [totalArchivesResult] = await db.select({ count: count() }).from(archivesTable).execute();
    const [totalCategoriesResult] = await db.select({ count: count() }).from(categoriesTable).execute();

    // Get recent uploads (archives created in last 30 days)
    const [recentUploadsResult] = await db.select({ count: count() })
      .from(archivesTable)
      .where(gte(archivesTable.created_at, thirtyDaysAgo))
      .execute();

    // Get recent accesses (access logs in last 30 days)
    const [recentAccessesResult] = await db.select({ count: count() })
      .from(accessLogsTable)
      .where(gte(accessLogsTable.created_at, thirtyDaysAgo))
      .execute();

    // Get total storage used (sum of all file sizes)
    const [storageUsedResult] = await db.select({ total: sum(archivesTable.file_size) })
      .from(archivesTable)
      .execute();

    return {
      total_users: totalUsersResult.count,
      total_archives: totalArchivesResult.count,
      total_categories: totalCategoriesResult.count,
      recent_uploads: recentUploadsResult.count,
      recent_accesses: recentAccessesResult.count,
      storage_used: storageUsedResult.total ? parseInt(storageUsedResult.total) : 0
    };
  } catch (error) {
    console.error('Dashboard stats retrieval failed:', error);
    throw error;
  }
}
