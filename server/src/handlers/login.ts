
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';

export async function login(input: LoginInput): Promise<{ user: User; token: string }> {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is inactive');
    }

    // Verify password using Bun's built-in password verification
    const isPasswordValid = await Bun.password.verify(input.password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token using Bun's built-in JWT
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    const secret = process.env['JWT_SECRET'] || 'fallback_secret_for_testing';
    const token = await new Promise<string>((resolve, reject) => {
      const header = JSON.stringify({ alg: 'HS256', typ: 'JWT' });
      const payloadStr = JSON.stringify(payload);
      
      const headerB64 = btoa(header).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const payloadB64 = btoa(payloadStr).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      
      const data = `${headerB64}.${payloadB64}`;
      
      // Create HMAC signature
      crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      ).then(key => {
        return crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
      }).then(signature => {
        const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
          .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
        resolve(`${data}.${signatureB64}`);
      }).catch(reject);
    });

    // Return user data
    const userResponse: User = {
      id: user.id,
      email: user.email,
      password_hash: user.password_hash,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    return {
      user: userResponse,
      token
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}
