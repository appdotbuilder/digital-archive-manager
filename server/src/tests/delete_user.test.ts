
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type CreateUserInput } from '../schema';
import { deleteUser } from '../handlers/delete_user';

const createTestUser = async (userData: Partial<CreateUserInput> = {}): Promise<number> => {
  const defaultUser: CreateUserInput = {
    email: 'test@example.com',
    password: 'password123',
    first_name: 'Test',
    last_name: 'User',
    role: 'user'
  };

  const result = await db.insert(usersTable)
    .values({
      ...defaultUser,
      ...userData,
      password_hash: 'hashed_' + (userData.password || defaultUser.password)
    })
    .returning()
    .execute();

  return result[0].id;
};

describe('deleteUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should soft delete a user by setting is_active to false', async () => {
    const userId = await createTestUser();

    const result = await deleteUser(userId);

    expect(result.id).toEqual(userId);
    expect(result.is_active).toBe(false);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].is_active).toBe(false);
  });

  it('should throw error when user does not exist', async () => {
    const nonExistentId = 999;

    await expect(deleteUser(nonExistentId)).rejects.toThrow(/user not found/i);
  });

  it('should allow deleting a regular user', async () => {
    const userId = await createTestUser({ role: 'user' });

    const result = await deleteUser(userId);

    expect(result.is_active).toBe(false);
    expect(result.role).toEqual('user');
  });

  it('should allow deleting an admin when other admins exist', async () => {
    // Create two admin users
    const adminId1 = await createTestUser({
      email: 'admin1@example.com',
      role: 'admin'
    });
    
    await createTestUser({
      email: 'admin2@example.com',
      role: 'admin'
    });

    const result = await deleteUser(adminId1);

    expect(result.is_active).toBe(false);
    expect(result.role).toEqual('admin');
  });

  it('should prevent deleting the last active admin', async () => {
    const adminId = await createTestUser({
      email: 'lastadmin@example.com',
      role: 'admin'
    });

    await expect(deleteUser(adminId)).rejects.toThrow(/cannot delete the last active admin/i);

    // Verify user is still active
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, adminId))
      .execute();

    expect(users[0].is_active).toBe(true);
  });

  it('should allow deleting admin when other admins exist but some are inactive', async () => {
    // Create active admin
    const activeAdminId = await createTestUser({
      email: 'active@example.com',
      role: 'admin'
    });

    // Create another active admin
    await createTestUser({
      email: 'another@example.com',
      role: 'admin'
    });

    // Create inactive admin
    const inactiveAdminId = await createTestUser({
      email: 'inactive@example.com',
      role: 'admin'
    });

    // First deactivate one admin
    await db.update(usersTable)
      .set({ is_active: false })
      .where(eq(usersTable.id, inactiveAdminId))
      .execute();

    // Should still be able to delete the active admin since another active admin exists
    const result = await deleteUser(activeAdminId);

    expect(result.is_active).toBe(false);
  });

  it('should update the updated_at timestamp', async () => {
    const userId = await createTestUser();

    // Get original timestamp
    const originalUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    const originalUpdatedAt = originalUser[0].updated_at;

    // Small delay to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const result = await deleteUser(userId);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > originalUpdatedAt).toBe(true);
  });
});
