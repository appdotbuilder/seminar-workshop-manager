import { db } from '../db';
import { registrationsTable } from '../db/schema';
import { type UpdateRegistrationStatusInput, type Registration } from '../schema';
import { eq } from 'drizzle-orm';

export const updateRegistrationStatus = async (input: UpdateRegistrationStatusInput): Promise<Registration | null> => {
  try {
    // Update the registration status
    const result = await db.update(registrationsTable)
      .set({
        status: input.status
      })
      .where(eq(registrationsTable.id, input.id))
      .returning()
      .execute();

    // Return null if no registration was found
    if (result.length === 0) {
      return null;
    }

    // Return the updated registration
    const registration = result[0];
    return {
      ...registration,
      // Convert numeric fields - cost is handled at the seminar level, not registration
      // All other fields are already in correct format
    };
  } catch (error) {
    console.error('Registration status update failed:', error);
    throw error;
  }
};