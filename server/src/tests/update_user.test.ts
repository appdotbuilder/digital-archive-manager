
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

// Test user setup
const createTestUser = async (): Promise<number> => {
  const result = await db.insert(usersTable)
    .values({
      email: 'test@example.com',
      password_hash: 'hashed_password_123',
      first_name: 'John',
      last_name: 'Doe',
      role: 'user',
      is_active: true
    })
    .returning()
    .execute();
  
  return result[0].id;
};

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user fields', async () => {
    const userId = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: userId,
      email: 'updated@example.com',
      first_name: 'Jane',
      last_name: 'Smith',
      role: 'admin',
      is_active: false
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(userId);
    expect(result.email).toEqual('updated@example.com');
    expect(result.first_name).toEqual('Jane');
    expect(result.last_name).toEqual('Smith');
    expect(result.role).toEqual('admin');
    expect(result.is_active).toEqual(false);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only provided fields', async () => {
    const userId = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: userId,
      first_name: 'UpdatedName'
    };

    const result = await updateUser(updateInput);

    // Updated field
    expect(result.first_name).toEqual('UpdatedName');
    
    // Unchanged fields should remain the same
    expect(result.email).toEqual('test@example.com');
    expect(result.last_name).toEqual('Doe');
    expect(result.role).toEqual('user');
    expect(result.is_active).toEqual(true);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save changes to database', async () => {
    const userId = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: userId,
      email: 'verified@example.com',
      role: 'admin'
    };

    await updateUser(updateInput);

    // Verify changes were persisted
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('verified@example.com');
    expect(users[0].role).toEqual('admin');
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update the updated_at timestamp', async () => {
    const userId = await createTestUser();
    
    // Get original timestamp
    const originalUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();
    
    const originalTimestamp = originalUser[0].updated_at;

    // Wait a moment to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateUserInput = {
      id: userId,
      first_name: 'Updated'
    };

    const result = await updateUser(updateInput);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalTimestamp.getTime());
  });

  it('should throw error for non-existent user', async () => {
    const updateInput: UpdateUserInput = {
      id: 999999,
      first_name: 'NonExistent'
    };

    expect(updateUser(updateInput)).rejects.toThrow(/User with id 999999 not found/i);
  });
});
