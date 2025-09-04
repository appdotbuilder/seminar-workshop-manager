import { db } from '../db';
import { seminarsTable, usersTable } from '../db/schema';
import { type Seminar } from '../schema';
import { eq } from 'drizzle-orm';

export const getSeminars = async (): Promise<Seminar[]> => {
  try {
    // Fetch all seminars with speaker information via join
    const results = await db.select()
      .from(seminarsTable)
      .innerJoin(usersTable, eq(seminarsTable.speaker_id, usersTable.id))
      .execute();

    // Map results to Seminar type, handling numeric conversion and nested structure
    return results.map(result => ({
      id: result.seminars.id,
      title: result.seminars.title,
      description: result.seminars.description,
      date: result.seminars.date,
      time: result.seminars.time,
      location: result.seminars.location,
      speaker_id: result.seminars.speaker_id,
      capacity: result.seminars.capacity,
      cost: result.seminars.cost ? parseFloat(result.seminars.cost) : null, // Convert numeric to number
      registration_type: result.seminars.registration_type,
      created_at: result.seminars.created_at
    }));
  } catch (error) {
    console.error('Failed to fetch seminars:', error);
    throw error;
  }
};