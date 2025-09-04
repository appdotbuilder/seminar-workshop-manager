import { db } from '../db';
import { registrationsTable, seminarsTable, usersTable } from '../db/schema';
import { type GetRegistrationsByUserInput, type Registration } from '../schema';
import { eq } from 'drizzle-orm';

export const getRegistrationsByUser = async (input: GetRegistrationsByUserInput): Promise<Registration[]> => {
  try {
    // Join with seminars and speakers to provide complete information
    const results = await db.select()
      .from(registrationsTable)
      .innerJoin(seminarsTable, eq(registrationsTable.seminar_id, seminarsTable.id))
      .innerJoin(usersTable, eq(seminarsTable.speaker_id, usersTable.id))
      .where(eq(registrationsTable.participant_id, input.participant_id))
      .execute();

    // Transform the joined data back to Registration format
    return results.map(result => {
      const registration = result.registrations;
      return {
        id: registration.id,
        seminar_id: registration.seminar_id,
        participant_id: registration.participant_id,
        registration_date: registration.registration_date,
        status: registration.status,
        created_at: registration.created_at
      };
    });
  } catch (error) {
    console.error('Get registrations by user failed:', error);
    throw error;
  }
};