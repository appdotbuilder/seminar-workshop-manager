import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUsers } from '../handlers/get_users';

// Test user inputs
const testUser1: CreateUserInput = {
  name: 'Alice Johnson',
  email: 'alice@example.com',
  role: 'participant',
  password: 'password123'
};

const testUser2: CreateUserInput = {
  name: 'Bob Smith',
  email: 'bob@example.com',
  role: 'speaker',
  password: 'password456'
};

const testUser3: CreateUserInput = {
  name: 'Carol Admin',
  email: 'carol@example.com',
  role: 'admin',
  password: 'adminpass'
};

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();
    
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return all users from database', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([testUser1, testUser2, testUser3])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    
    // Verify all users are returned
    const names = result.map(user => user.name);
    expect(names).toContain('Alice Johnson');
    expect(names).toContain('Bob Smith');
    expect(names).toContain('Carol Admin');

    const emails = result.map(user => user.email);
    expect(emails).toContain('alice@example.com');
    expect(emails).toContain('bob@example.com');
    expect(emails).toContain('carol@example.com');
  });

  it('should return users with correct field types', async () => {
    await db.insert(usersTable)
      .values(testUser1)
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    const user = result[0];

    // Verify field types
    expect(typeof user.id).toBe('number');
    expect(typeof user.name).toBe('string');
    expect(typeof user.email).toBe('string');
    expect(typeof user.role).toBe('string');
    expect(typeof user.password).toBe('string');
    expect(user.created_at).toBeInstanceOf(Date);

    // Verify specific values
    expect(user.name).toEqual('Alice Johnson');
    expect(user.email).toEqual('alice@example.com');
    expect(user.role).toEqual('participant');
    expect(user.password).toEqual('password123');
    expect(user.id).toBeDefined();
  });

  it('should return users with different roles correctly', async () => {
    await db.insert(usersTable)
      .values([testUser1, testUser2, testUser3])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    
    // Find users by email to verify roles
    const alice = result.find(u => u.email === 'alice@example.com');
    const bob = result.find(u => u.email === 'bob@example.com');
    const carol = result.find(u => u.email === 'carol@example.com');

    expect(alice?.role).toEqual('participant');
    expect(bob?.role).toEqual('speaker');
    expect(carol?.role).toEqual('admin');
  });

  it('should return users ordered by creation time', async () => {
    // Insert users with slight delay to ensure different timestamps
    await db.insert(usersTable)
      .values(testUser1)
      .execute();

    // Small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(usersTable)
      .values(testUser2)
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);
    
    // Verify timestamps are present and in order
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[1].created_at).toBeInstanceOf(Date);
    expect(result[0].created_at <= result[1].created_at).toBe(true);
  });

  it('should handle database with many users efficiently', async () => {
    // Create multiple users
    const manyUsers = Array.from({ length: 50 }, (_, i) => ({
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      role: i % 3 === 0 ? 'admin' as const : (i % 2 === 0 ? 'speaker' as const : 'participant' as const),
      password: `password${i + 1}`
    }));

    await db.insert(usersTable)
      .values(manyUsers)
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(50);
    
    // Verify all users have unique IDs
    const ids = result.map(user => user.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toEqual(50);

    // Verify all users have unique emails
    const emails = result.map(user => user.email);
    const uniqueEmails = new Set(emails);
    expect(uniqueEmails.size).toEqual(50);
  });
});