import { db } from '../db';
import { registrationsTable, usersTable } from '../db/schema';
import { type GetRegistrationsBySeminarInput, type Registration } from '../schema';
import { eq } from 'drizzle-orm';

export const getRegistrationsBySeminar = async (input: GetRegistrationsBySeminarInput): Promise<Registration[]> => {
  try {
    // Query registrations with participant information via join
    const results = await db.select()
      .from(registrationsTable)
      .innerJoin(usersTable, eq(registrationsTable.participant_id, usersTable.id))
      .where(eq(registrationsTable.seminar_id, input.seminar_id))
      .execute();

    // Transform joined results back to Registration format
    // The join creates nested objects: { registrations: {...}, users: {...} }
    return results.map(result => ({
      id: result.registrations.id,
      seminar_id: result.registrations.seminar_id,
      participant_id: result.registrations.participant_id,
      registration_date: result.registrations.registration_date,
      status: result.registrations.status,
      created_at: result.registrations.created_at
    }));
  } catch (error) {
    console.error('Failed to fetch registrations by seminar:', error);
    throw error;
  }
};