
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login } from '../handlers/login';

const testUser = {
  email: 'test@example.com',
  password: 'password123',
  first_name: 'John',
  last_name: 'Doe',
  role: 'user' as const
};

const adminUser = {
  email: 'admin@example.com',
  password: 'adminpass123',
  first_name: 'Admin',
  last_name: 'User',
  role: 'admin' as const
};

// Helper function to verify JWT token
async function verifyJWT(token: string, secret: string): Promise<any> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  
  // Verify signature
  const data = `${headerB64}.${payloadB64}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  
  const signature = Uint8Array.from(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const isValid = await crypto.subtle.verify('HMAC', key, signature, new TextEncoder().encode(data));
  
  if (!isValid) {
    throw new Error('Invalid token signature');
  }
  
  // Decode payload
  const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
  return payload;
}

describe('login', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully login with valid credentials', async () => {
    // Create test user with hashed password
    const hashedPassword = await Bun.password.hash(testUser.password);
    await db.insert(usersTable).values({
      email: testUser.email,
      password_hash: hashedPassword,
      first_name: testUser.first_name,
      last_name: testUser.last_name,
      role: testUser.role,
      is_active: true
    }).execute();

    const input: LoginInput = {
      email: testUser.email,
      password: testUser.password
    };

    const result = await login(input);

    // Verify user data
    expect(result.user.email).toEqual(testUser.email);
    expect(result.user.first_name).toEqual(testUser.first_name);
    expect(result.user.last_name).toEqual(testUser.last_name);
    expect(result.user.role).toEqual(testUser.role);
    expect(result.user.is_active).toBe(true);
    expect(result.user.id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);

    // Verify token is generated
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(0);

    // Verify token is valid JWT
    const decoded = await verifyJWT(result.token, process.env['JWT_SECRET'] || 'fallback_secret_for_testing');
    expect(decoded.userId).toEqual(result.user.id);
    expect(decoded.email).toEqual(testUser.email);
    expect(decoded.role).toEqual(testUser.role);
    expect(decoded.exp).toBeDefined();
  });

  it('should login admin user successfully', async () => {
    // Create admin user
    const hashedPassword = await Bun.password.hash(adminUser.password);
    await db.insert(usersTable).values({
      email: adminUser.email,
      password_hash: hashedPassword,
      first_name: adminUser.first_name,
      last_name: adminUser.last_name,
      role: adminUser.role,
      is_active: true
    }).execute();

    const input: LoginInput = {
      email: adminUser.email,
      password: adminUser.password
    };

    const result = await login(input);

    expect(result.user.role).toEqual('admin');
    expect(result.user.email).toEqual(adminUser.email);
    expect(result.token).toBeDefined();

    // Verify admin role in token
    const decoded = await verifyJWT(result.token, process.env['JWT_SECRET'] || 'fallback_secret_for_testing');
    expect(decoded.role).toEqual('admin');
  });

  it('should throw error for non-existent user', async () => {
    const input: LoginInput = {
      email: 'nonexistent@example.com',
      password: 'password123'
    };

    await expect(login(input)).rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for wrong password', async () => {
    // Create test user
    const hashedPassword = await Bun.password.hash(testUser.password);
    await db.insert(usersTable).values({
      email: testUser.email,
      password_hash: hashedPassword,
      first_name: testUser.first_name,
      last_name: testUser.last_name,
      role: testUser.role,
      is_active: true
    }).execute();

    const input: LoginInput = {
      email: testUser.email,
      password: 'wrongpassword'
    };

    await expect(login(input)).rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for inactive user', async () => {
    // Create inactive user
    const hashedPassword = await Bun.password.hash(testUser.password);
    await db.insert(usersTable).values({
      email: testUser.email,
      password_hash: hashedPassword,
      first_name: testUser.first_name,
      last_name: testUser.last_name,
      role: testUser.role,
      is_active: false // Inactive user
    }).execute();

    const input: LoginInput = {
      email: testUser.email,
      password: testUser.password
    };

    await expect(login(input)).rejects.toThrow(/account is inactive/i);
  });

  it('should throw error for empty email', async () => {
    const input: LoginInput = {
      email: '',
      password: 'password123'
    };

    await expect(login(input)).rejects.toThrow(/invalid email or password/i);
  });

  it('should handle case-sensitive email correctly', async () => {
    // Create user with lowercase email
    const hashedPassword = await Bun.password.hash(testUser.password);
    await db.insert(usersTable).values({
      email: testUser.email.toLowerCase(),
      password_hash: hashedPassword,
      first_name: testUser.first_name,
      last_name: testUser.last_name,
      role: testUser.role,
      is_active: true
    }).execute();

    // Try to login with uppercase email
    const input: LoginInput = {
      email: testUser.email.toUpperCase(),
      password: testUser.password
    };

    await expect(login(input)).rejects.toThrow(/invalid email or password/i);
  });

  it('should generate different tokens for different logins', async () => {
    // Create test user
    const hashedPassword = await Bun.password.hash(testUser.password);
    await db.insert(usersTable).values({
      email: testUser.email,
      password_hash: hashedPassword,
      first_name: testUser.first_name,
      last_name: testUser.last_name,
      role: testUser.role,
      is_active: true
    }).execute();

    const input: LoginInput = {
      email: testUser.email,
      password: testUser.password
    };

    const result1 = await login(input);
    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 1000));
    const result2 = await login(input);

    expect(result1.token).not.toEqual(result2.token);
    expect(result1.user.id).toEqual(result2.user.id);
  });

  it('should create token with proper expiration', async () => {
    // Create test user
    const hashedPassword = await Bun.password.hash(testUser.password);
    await db.insert(usersTable).values({
      email: testUser.email,
      password_hash: hashedPassword,
      first_name: testUser.first_name,
      last_name: testUser.last_name,
      role: testUser.role,
      is_active: true
    }).execute();

    const input: LoginInput = {
      email: testUser.email,
      password: testUser.password
    };

    const beforeLogin = Math.floor(Date.now() / 1000);
    const result = await login(input);
    const afterLogin = Math.floor(Date.now() / 1000);

    const decoded = await verifyJWT(result.token, process.env['JWT_SECRET'] || 'fallback_secret_for_testing');
    
    // Token should expire 24 hours from now
    const expectedExp = beforeLogin + (24 * 60 * 60);
    const maxExpectedExp = afterLogin + (24 * 60 * 60);
    
    expect(decoded.exp).toBeGreaterThanOrEqual(expectedExp);
    expect(decoded.exp).toBeLessThanOrEqual(maxExpectedExp);
  });
});
