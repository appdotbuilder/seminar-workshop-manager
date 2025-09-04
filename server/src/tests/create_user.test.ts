import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateUserInput = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  role: 'participant',
  password: 'password123'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with hashed password', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.name).toEqual('John Doe');
    expect(result.email).toEqual('john.doe@example.com');
    expect(result.role).toEqual('participant');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    
    // Password should be hashed, not plain text
    expect(result.password).not.toEqual('password123');
    expect(result.password.length).toBeGreaterThan(20); // Hashed password should be longer
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query user from database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].name).toEqual('John Doe');
    expect(users[0].email).toEqual('john.doe@example.com');
    expect(users[0].role).toEqual('participant');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].password).not.toEqual('password123'); // Should be hashed
  });

  it('should create users with different roles', async () => {
    const adminInput: CreateUserInput = {
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin',
      password: 'adminpass123'
    };

    const speakerInput: CreateUserInput = {
      name: 'Speaker User',
      email: 'speaker@example.com',
      role: 'speaker',
      password: 'speakerpass123'
    };

    const admin = await createUser(adminInput);
    const speaker = await createUser(speakerInput);

    expect(admin.role).toEqual('admin');
    expect(speaker.role).toEqual('speaker');
    
    // Verify both users exist in database
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(2);
  });

  it('should verify password can be verified with Bun.password.verify', async () => {
    const result = await createUser(testInput);

    // The hashed password should be verifiable
    const isValid = await Bun.password.verify('password123', result.password);
    const isInvalid = await Bun.password.verify('wrongpassword', result.password);

    expect(isValid).toBe(true);
    expect(isInvalid).toBe(false);
  });

  it('should handle unique email constraint violation', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with same email
    const duplicateInput: CreateUserInput = {
      name: 'Jane Doe',
      email: 'john.doe@example.com', // Same email
      role: 'admin',
      password: 'different123'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/duplicate key value|unique constraint/i);
  });

  it('should create user with minimum password length', async () => {
    const minPasswordInput: CreateUserInput = {
      name: 'Min User',
      email: 'min@example.com',
      role: 'participant',
      password: '123456' // Exactly 6 characters (minimum)
    };

    const result = await createUser(minPasswordInput);
    expect(result.name).toEqual('Min User');
    
    // Verify password was hashed and is verifiable
    const isValid = await Bun.password.verify('123456', result.password);
    expect(isValid).toBe(true);
  });
});