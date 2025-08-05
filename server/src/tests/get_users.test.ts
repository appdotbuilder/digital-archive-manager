
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUsers } from '../handlers/get_users';

// Test user data
const testUsers: CreateUserInput[] = [
  {
    email: 'john.doe@example.com',
    password: 'password123',
    first_name: 'John',
    last_name: 'Doe',
    role: 'user'
  },
  {
    email: 'jane.admin@example.com',
    password: 'adminpass456',
    first_name: 'Jane',
    last_name: 'Admin',
    role: 'admin'
  },
  {
    email: 'inactive.user@example.com',
    password: 'password789',
    first_name: 'Inactive',
    last_name: 'User',
    role: 'user'
  }
];

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();
    expect(result).toEqual([]);
  });

  it('should return all users without password_hash', async () => {
    // Create test users
    await db.insert(usersTable).values([
      {
        email: testUsers[0].email,
        password_hash: 'hashed_password_1',
        first_name: testUsers[0].first_name,
        last_name: testUsers[0].last_name,
        role: testUsers[0].role
      },
      {
        email: testUsers[1].email,
        password_hash: 'hashed_password_2',
        first_name: testUsers[1].first_name,
        last_name: testUsers[1].last_name,
        role: testUsers[1].role
      }
    ]).execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);
    
    // Verify first user
    expect(result[0].email).toEqual('john.doe@example.com');
    expect(result[0].first_name).toEqual('John');
    expect(result[0].last_name).toEqual('Doe');
    expect(result[0].role).toEqual('user');
    expect(result[0].is_active).toEqual(true);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
    
    // Verify second user
    expect(result[1].email).toEqual('jane.admin@example.com');
    expect(result[1].first_name).toEqual('Jane');
    expect(result[1].last_name).toEqual('Admin');
    expect(result[1].role).toEqual('admin');
    expect(result[1].is_active).toEqual(true);

    // Ensure password_hash is not included in response
    expect(result[0]).not.toHaveProperty('password_hash');
    expect(result[1]).not.toHaveProperty('password_hash');
  });

  it('should return users with correct data types', async () => {
    // Create a test user with inactive status
    await db.insert(usersTable).values({
      email: testUsers[2].email,
      password_hash: 'hashed_password_3',
      first_name: testUsers[2].first_name,
      last_name: testUsers[2].last_name,
      role: testUsers[2].role,
      is_active: false
    }).execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    expect(typeof result[0].id).toBe('number');
    expect(typeof result[0].email).toBe('string');
    expect(typeof result[0].first_name).toBe('string');
    expect(typeof result[0].last_name).toBe('string');
    expect(typeof result[0].role).toBe('string');
    expect(typeof result[0].is_active).toBe('boolean');
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    // Verify inactive status is preserved
    expect(result[0].is_active).toEqual(false);
  });

  it('should return users in creation order', async () => {
    // Create users with slight delay to ensure different timestamps
    await db.insert(usersTable).values({
      email: 'first@example.com',
      password_hash: 'hash1',
      first_name: 'First',
      last_name: 'User',
      role: 'user'
    }).execute();

    await db.insert(usersTable).values({
      email: 'second@example.com',
      password_hash: 'hash2',
      first_name: 'Second',
      last_name: 'User',
      role: 'admin'
    }).execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);
    expect(result[0].email).toEqual('first@example.com');
    expect(result[1].email).toEqual('second@example.com');
    expect(result[0].created_at <= result[1].created_at).toBe(true);
  });
});
