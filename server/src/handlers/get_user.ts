import { db } from '../db';
import { usersTable } from '../db/schema';
import { type GetUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const getUser = async (input: GetUserInput): Promise<User | null> => {
  try {
    const result = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    // Return the user record - no numeric conversions needed for this table
    return result[0];
  } catch (error) {
    console.error('User retrieval failed:', error);
    throw error;
  }
};