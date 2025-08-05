
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// Helper function to verify password
const verifyPassword = (password: string, hash: string): boolean => {
  const [salt, storedHash] = hash.split(':');
  const computedHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return storedHash === computedHash;
};

// Test input with all required fields
const testInput: CreateUserInput = {
  email: 'test@example.com',
  password: 'password123',
  first_name: 'John',
  last_name: 'Doe',
  role: 'user'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with hashed password', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.role).toEqual('user');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Password should be hashed, not plain text
    expect(result.password_hash).not.toEqual('password123');
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash.length).toBeGreaterThan(10);
    expect(result.password_hash).toContain(':'); // Should contain salt:hash format

    // Verify password hash is valid
    const isValidHash = verifyPassword('password123', result.password_hash);
    expect(isValidHash).toBe(true);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].first_name).toEqual('John');
    expect(users[0].last_name).toEqual('Doe');
    expect(users[0].role).toEqual('user');
    expect(users[0].is_active).toEqual(true);
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);

    // Verify password is properly hashed in database
    const isValidHash = verifyPassword('password123', users[0].password_hash);
    expect(isValidHash).toBe(true);
  });

  it('should create admin user when role is specified', async () => {
    const adminInput: CreateUserInput = {
      ...testInput,
      email: 'admin@example.com',
      role: 'admin'
    };

    const result = await createUser(adminInput);

    expect(result.role).toEqual('admin');
    expect(result.email).toEqual('admin@example.com');
  });

  it('should use default role when not specified', async () => {
    const inputWithoutRole = {
      email: 'defaultrole@example.com',
      password: 'password123',
      first_name: 'Jane',
      last_name: 'Smith'
    };

    // Zod schema will apply default role
    const parsedInput = { ...inputWithoutRole, role: 'user' as const };
    const result = await createUser(parsedInput);

    expect(result.role).toEqual('user');
  });

  it('should reject duplicate email addresses', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create second user with same email
    const duplicateInput: CreateUserInput = {
      ...testInput,
      first_name: 'Jane',
      last_name: 'Smith'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/already exists/i);
  });

  it('should handle different email formats correctly', async () => {
    const emailVariations = [
      'user.name@example.com',
      'user+tag@example.org',
      'User.Email@EXAMPLE.COM'
    ];

    for (const email of emailVariations) {
      const input: CreateUserInput = {
        ...testInput,
        email,
        first_name: `User${emailVariations.indexOf(email)}`
      };

      const result = await createUser(input);
      expect(result.email).toEqual(email);
      expect(result.first_name).toEqual(`User${emailVariations.indexOf(email)}`);
    }
  });

  it('should hash different passwords differently', async () => {
    const input1: CreateUserInput = {
      ...testInput,
      email: 'user1@example.com',
      password: 'password123'
    };

    const input2: CreateUserInput = {
      ...testInput,
      email: 'user2@example.com',
      password: 'differentpassword'
    };

    const user1 = await createUser(input1);
    const user2 = await createUser(input2);

    // Different passwords should produce different hashes
    expect(user1.password_hash).not.toEqual(user2.password_hash);

    // Both hashes should be valid for their respective passwords
    const isValid1 = verifyPassword('password123', user1.password_hash);
    const isValid2 = verifyPassword('differentpassword', user2.password_hash);
    expect(isValid1).toBe(true);
    expect(isValid2).toBe(true);

    // Cross-validation should fail
    const crossValid1 = verifyPassword('differentpassword', user1.password_hash);
    const crossValid2 = verifyPassword('password123', user2.password_hash);
    expect(crossValid1).toBe(false);
    expect(crossValid2).toBe(false);
  });

  it('should generate unique salts for same password', async () => {
    const input1: CreateUserInput = {
      ...testInput,
      email: 'user1@example.com',
      password: 'samepassword'
    };

    const input2: CreateUserInput = {
      ...testInput,
      email: 'user2@example.com',
      password: 'samepassword'
    };

    const user1 = await createUser(input1);
    const user2 = await createUser(input2);

    // Same passwords should produce different hashes due to unique salts
    expect(user1.password_hash).not.toEqual(user2.password_hash);

    // But both should verify correctly
    const isValid1 = verifyPassword('samepassword', user1.password_hash);
    const isValid2 = verifyPassword('samepassword', user2.password_hash);
    expect(isValid1).toBe(true);
    expect(isValid2).toBe(true);

    // Extract salts and verify they're different
    const salt1 = user1.password_hash.split(':')[0];
    const salt2 = user2.password_hash.split(':')[0];
    expect(salt1).not.toEqual(salt2);
  });
});
