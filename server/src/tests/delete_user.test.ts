import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type GetUserInput } from '../schema';
import { deleteUser } from '../handlers/delete_user';
import { eq } from 'drizzle-orm';

describe('deleteUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing user', async () => {
    // Create a test user first
    const testUser = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com',
        role: 'participant',
        password: 'password123'
      })
      .returning()
      .execute();

    const userId = testUser[0].id;
    const input: GetUserInput = { id: userId };

    // Delete the user
    const result = await deleteUser(input);

    // Should return true for successful deletion
    expect(result).toBe(true);

    // Verify user was actually deleted from database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(users).toHaveLength(0);
  });

  it('should return false when user does not exist', async () => {
    const input: GetUserInput = { id: 999999 }; // Non-existent ID

    const result = await deleteUser(input);

    // Should return false when no user was deleted
    expect(result).toBe(false);
  });

  it('should delete the correct user when multiple users exist', async () => {
    // Create multiple test users
    const users = await db.insert(usersTable)
      .values([
        {
          name: 'User One',
          email: 'user1@example.com',
          role: 'participant',
          password: 'password123'
        },
        {
          name: 'User Two',
          email: 'user2@example.com',
          role: 'speaker',
          password: 'password456'
        },
        {
          name: 'User Three',
          email: 'user3@example.com',
          role: 'admin',
          password: 'password789'
        }
      ])
      .returning()
      .execute();

    const userToDelete = users[1]; // Delete the middle user
    const input: GetUserInput = { id: userToDelete.id };

    // Delete the specific user
    const result = await deleteUser(input);

    expect(result).toBe(true);

    // Verify only the target user was deleted
    const remainingUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(remainingUsers).toHaveLength(2);
    expect(remainingUsers.find(u => u.id === userToDelete.id)).toBeUndefined();
    expect(remainingUsers.find(u => u.id === users[0].id)).toBeDefined();
    expect(remainingUsers.find(u => u.id === users[2].id)).toBeDefined();
  });

  it('should handle deletion of users with different roles', async () => {
    // Create users with different roles
    const adminUser = await db.insert(usersTable)
      .values({
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
        password: 'adminpass'
      })
      .returning()
      .execute();

    const speakerUser = await db.insert(usersTable)
      .values({
        name: 'Speaker User',
        email: 'speaker@example.com',
        role: 'speaker',
        password: 'speakerpass'
      })
      .returning()
      .execute();

    const participantUser = await db.insert(usersTable)
      .values({
        name: 'Participant User',
        email: 'participant@example.com',
        role: 'participant',
        password: 'participantpass'
      })
      .returning()
      .execute();

    // Delete admin user
    const adminResult = await deleteUser({ id: adminUser[0].id });
    expect(adminResult).toBe(true);

    // Delete speaker user
    const speakerResult = await deleteUser({ id: speakerUser[0].id });
    expect(speakerResult).toBe(true);

    // Delete participant user
    const participantResult = await deleteUser({ id: participantUser[0].id });
    expect(participantResult).toBe(true);

    // Verify all users were deleted
    const remainingUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(remainingUsers).toHaveLength(0);
  });

  it('should not affect other users when deleting one user', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          name: 'Keep User',
          email: 'keep@example.com',
          role: 'participant',
          password: 'keeppass'
        },
        {
          name: 'Delete User',
          email: 'delete@example.com',
          role: 'speaker',
          password: 'deletepass'
        }
      ])
      .returning()
      .execute();

    const keepUser = users[0];
    const deleteUser_target = users[1];

    // Delete one user
    const result = await deleteUser({ id: deleteUser_target.id });

    expect(result).toBe(true);

    // Verify the correct user was deleted and other user remains
    const remainingUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(remainingUsers).toHaveLength(1);
    expect(remainingUsers[0].id).toBe(keepUser.id);
    expect(remainingUsers[0].name).toBe('Keep User');
    expect(remainingUsers[0].email).toBe('keep@example.com');
  });
});