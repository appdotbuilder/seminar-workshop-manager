import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type User } from '../schema';

export const getSpeakers = async (): Promise<User[]> => {
  try {
    const speakers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.role, 'speaker'))
      .execute();

    return speakers;
  } catch (error) {
    console.error('Failed to get speakers:', error);
    throw error;
  }
};