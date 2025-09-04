import { db } from '../db';
import { registrationsTable } from '../db/schema';
import { type UpdateRegistrationStatusInput } from '../schema';
import { eq } from 'drizzle-orm';

export const cancelRegistration = async (input: UpdateRegistrationStatusInput): Promise<boolean> => {
  try {
    // Update the registration status to 'cancelled'
    const result = await db.update(registrationsTable)
      .set({
        status: 'cancelled'
      })
      .where(eq(registrationsTable.id, input.id))
      .returning()
      .execute();

    // Return true if a registration was updated, false if no registration found
    return result.length > 0;
  } catch (error) {
    console.error('Registration cancellation failed:', error);
    throw error;
  }
};