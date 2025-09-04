import { db } from '../db';
import { registrationsTable, seminarsTable, usersTable } from '../db/schema';
import { type Registration } from '../schema';
import { eq } from 'drizzle-orm';

export const getRegistrations = async (): Promise<Registration[]> => {
  try {
    // Fetch all registrations with seminar and participant information
    const results = await db.select({
      id: registrationsTable.id,
      seminar_id: registrationsTable.seminar_id,
      participant_id: registrationsTable.participant_id,
      registration_date: registrationsTable.registration_date,
      status: registrationsTable.status,
      created_at: registrationsTable.created_at,
      // Include seminar information
      seminar_title: seminarsTable.title,
      seminar_date: seminarsTable.date,
      seminar_location: seminarsTable.location,
      seminar_cost: seminarsTable.cost,
      // Include participant information
      participant_name: usersTable.name,
      participant_email: usersTable.email,
    })
    .from(registrationsTable)
    .innerJoin(seminarsTable, eq(registrationsTable.seminar_id, seminarsTable.id))
    .innerJoin(usersTable, eq(registrationsTable.participant_id, usersTable.id))
    .execute();

    // Transform results to match Registration schema while preserving joined data
    return results.map(result => ({
      id: result.id,
      seminar_id: result.seminar_id,
      participant_id: result.participant_id,
      registration_date: result.registration_date,
      status: result.status,
      created_at: result.created_at,
      // Additional fields from joins (not in base Registration type but useful)
      seminar_title: result.seminar_title,
      seminar_date: result.seminar_date,
      seminar_location: result.seminar_location,
      seminar_cost: result.seminar_cost ? parseFloat(result.seminar_cost) : null,
      participant_name: result.participant_name,
      participant_email: result.participant_email,
    })) as Registration[];
  } catch (error) {
    console.error('Get registrations failed:', error);
    throw error;
  }
};