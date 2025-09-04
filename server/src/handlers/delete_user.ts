import { db } from '../db';
import { usersTable } from '../db/schema';
import { type GetUserInput } from '../schema';
import { eq } from 'drizzle-orm';

export const deleteUser = async (input: GetUserInput): Promise<boolean> => {
  try {
    // Delete user record by ID
    const result = await db.delete(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    // Check if any rows were affected (user existed and was deleted)
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('User deletion failed:', error);
    throw error;
  }
};