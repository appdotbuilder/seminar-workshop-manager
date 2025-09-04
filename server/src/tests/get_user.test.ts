import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type GetUserInput, type CreateUserInput } from '../schema';
import { getUser } from '../handlers/get_user';
import { eq } from 'drizzle-orm';

// Test user data
const testUser: CreateUserInput = {
  name: 'Test User',
  email: 'test@example.com',
  role: 'participant',
  password: 'password123'
};

const createTestUser = async (): Promise<number> => {
  const result = await db.insert(usersTable)
    .values(testUser)
    .returning()
    .execute();
  return result[0].id;
};

describe('getUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should retrieve an existing user by ID', async () => {
    // Create a test user
    const userId = await createTestUser();

    const input: GetUserInput = { id: userId };
    const result = await getUser(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(userId);
    expect(result!.name).toEqual(testUser.name);
    expect(result!.email).toEqual(testUser.email);
    expect(result!.role).toEqual(testUser.role);
    expect(result!.password).toEqual(testUser.password);
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent user ID', async () => {
    const input: GetUserInput = { id: 999999 };
    const result = await getUser(input);

    expect(result).toBeNull();
  });

  it('should return null for zero ID', async () => {
    const input: GetUserInput = { id: 0 };
    const result = await getUser(input);

    expect(result).toBeNull();
  });

  it('should return null for negative ID', async () => {
    const input: GetUserInput = { id: -1 };
    const result = await getUser(input);

    expect(result).toBeNull();
  });

  it('should retrieve correct user when multiple users exist', async () => {
    // Create multiple test users
    const user1Id = await createTestUser();
    
    const user2Data: CreateUserInput = {
      name: 'Second User',
      email: 'second@example.com',
      role: 'speaker',
      password: 'password456'
    };
    const user2Result = await db.insert(usersTable)
      .values(user2Data)
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Retrieve second user
    const input: GetUserInput = { id: user2Id };
    const result = await getUser(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(user2Id);
    expect(result!.name).toEqual(user2Data.name);
    expect(result!.email).toEqual(user2Data.email);
    expect(result!.role).toEqual(user2Data.role);
    expect(result!.password).toEqual(user2Data.password);
  });

  it('should handle different user roles correctly', async () => {
    // Test with admin role
    const adminUserData: CreateUserInput = {
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin',
      password: 'adminpass123'
    };
    
    const adminResult = await db.insert(usersTable)
      .values(adminUserData)
      .returning()
      .execute();
    const adminId = adminResult[0].id;

    const input: GetUserInput = { id: adminId };
    const result = await getUser(input);

    expect(result).not.toBeNull();
    expect(result!.role).toEqual('admin');
    expect(result!.name).toEqual(adminUserData.name);
  });

  it('should maintain data integrity after retrieval', async () => {
    // Create user
    const userId = await createTestUser();

    // Retrieve user
    const input: GetUserInput = { id: userId };
    const result = await getUser(input);

    // Verify the user still exists in database with same data
    const dbCheck = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(dbCheck).toHaveLength(1);
    expect(dbCheck[0].name).toEqual(result!.name);
    expect(dbCheck[0].email).toEqual(result!.email);
    expect(dbCheck[0].role).toEqual(result!.role);
  });
});