import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type UpdateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

// Create a test user for updating
const createTestUser = async (): Promise<number> => {
  const testUser: CreateUserInput = {
    name: 'Original User',
    email: 'original@test.com',
    role: 'participant',
    password: 'originalpassword'
  };

  const hashedPassword = await Bun.password.hash(testUser.password);
  
  const result = await db.insert(usersTable)
    .values({
      name: testUser.name,
      email: testUser.email,
      role: testUser.role,
      password: hashedPassword
    })
    .returning()
    .execute();

  return result[0].id;
};

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user name', async () => {
    const userId = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: userId,
      name: 'Updated Name'
    };

    const result = await updateUser(updateInput);

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Updated Name');
    expect(result!.email).toEqual('original@test.com'); // Should remain unchanged
    expect(result!.role).toEqual('participant'); // Should remain unchanged
    expect(result!.id).toEqual(userId);
  });

  it('should update user email', async () => {
    const userId = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: userId,
      email: 'updated@test.com'
    };

    const result = await updateUser(updateInput);

    expect(result).not.toBeNull();
    expect(result!.email).toEqual('updated@test.com');
    expect(result!.name).toEqual('Original User'); // Should remain unchanged
    expect(result!.role).toEqual('participant'); // Should remain unchanged
  });

  it('should update user role', async () => {
    const userId = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: userId,
      role: 'speaker'
    };

    const result = await updateUser(updateInput);

    expect(result).not.toBeNull();
    expect(result!.role).toEqual('speaker');
    expect(result!.name).toEqual('Original User'); // Should remain unchanged
    expect(result!.email).toEqual('original@test.com'); // Should remain unchanged
  });

  it('should update user password and hash it', async () => {
    const userId = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: userId,
      password: 'newpassword123'
    };

    const result = await updateUser(updateInput);

    expect(result).not.toBeNull();
    
    // Verify password was hashed
    expect(result!.password).not.toEqual('newpassword123');
    expect(result!.password.length).toBeGreaterThan(20); // Hashed passwords are longer
    
    // Verify password can be verified with Bun's password verify
    const isValid = await Bun.password.verify('newpassword123', result!.password);
    expect(isValid).toBe(true);

    // Verify old password no longer works
    const isOldValid = await Bun.password.verify('originalpassword', result!.password);
    expect(isOldValid).toBe(false);
  });

  it('should update multiple fields at once', async () => {
    const userId = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: userId,
      name: 'Updated Name',
      email: 'updated@test.com',
      role: 'admin',
      password: 'newpassword'
    };

    const result = await updateUser(updateInput);

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Updated Name');
    expect(result!.email).toEqual('updated@test.com');
    expect(result!.role).toEqual('admin');
    
    // Verify password was hashed
    const isValid = await Bun.password.verify('newpassword', result!.password);
    expect(isValid).toBe(true);
  });

  it('should return null for non-existent user', async () => {
    const updateInput: UpdateUserInput = {
      id: 99999, // Non-existent ID
      name: 'Updated Name'
    };

    const result = await updateUser(updateInput);

    expect(result).toBeNull();
  });

  it('should return existing user when no fields are provided for update', async () => {
    const userId = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: userId
      // No other fields provided
    };

    const result = await updateUser(updateInput);

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Original User');
    expect(result!.email).toEqual('original@test.com');
    expect(result!.role).toEqual('participant');
  });

  it('should save updated user to database', async () => {
    const userId = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: userId,
      name: 'Database Updated Name',
      email: 'database@test.com'
    };

    await updateUser(updateInput);

    // Verify changes were persisted to database
    const savedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(savedUser).toHaveLength(1);
    expect(savedUser[0].name).toEqual('Database Updated Name');
    expect(savedUser[0].email).toEqual('database@test.com');
    expect(savedUser[0].role).toEqual('participant'); // Should remain unchanged
  });

  it('should handle partial updates correctly', async () => {
    const userId = await createTestUser();
    
    // First update: change name only
    await updateUser({
      id: userId,
      name: 'First Update'
    });

    // Second update: change email only
    const result = await updateUser({
      id: userId,
      email: 'second@update.com'
    });

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('First Update'); // Should keep the first update
    expect(result!.email).toEqual('second@update.com'); // Should have the second update
    expect(result!.role).toEqual('participant'); // Should remain original
  });

  it('should handle all user roles correctly', async () => {
    const userId = await createTestUser();
    
    // Test updating to each role
    const roles = ['admin', 'participant', 'speaker'] as const;
    
    for (const role of roles) {
      const result = await updateUser({
        id: userId,
        role: role
      });

      expect(result).not.toBeNull();
      expect(result!.role).toEqual(role);
    }
  });
});