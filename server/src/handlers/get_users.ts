
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';

export const getUsers = async (): Promise<Omit<User, 'password_hash'>[]> => {
  try {
    const results = await db.select({
      id: usersTable.id,
      email: usersTable.email,
      first_name: usersTable.first_name,
      last_name: usersTable.last_name,
      role: usersTable.role,
      is_active: usersTable.is_active,
      created_at: usersTable.created_at,
      updated_at: usersTable.updated_at
    })
    .from(usersTable)
    .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
};
