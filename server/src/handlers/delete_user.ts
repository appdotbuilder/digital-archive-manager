
import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq, and, ne, count } from 'drizzle-orm';
import { type User } from '../schema';

export async function deleteUser(userId: number): Promise<User> {
  try {
    // First, check if user exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (existingUsers.length === 0) {
      throw new Error('User not found');
    }

    const user = existingUsers[0];

    // If user is an admin, check if they are the last active admin
    if (user.role === 'admin') {
      const activeAdminsResult = await db.select({ count: count() })
        .from(usersTable)
        .where(
          and(
            eq(usersTable.role, 'admin'),
            eq(usersTable.is_active, true),
            ne(usersTable.id, userId)
          )
        )
        .execute();

      const activeAdminsCount = activeAdminsResult[0].count;
      
      if (activeAdminsCount === 0) {
        throw new Error('Cannot delete the last active admin user');
      }
    }

    // Soft delete the user by setting is_active to false
    const result = await db.update(usersTable)
      .set({ 
        is_active: false,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, userId))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User deletion failed:', error);
    throw error;
  }
}
