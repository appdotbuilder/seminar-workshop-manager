import { db } from '../db';
import { seminarsTable, usersTable } from '../db/schema';
import { type GetSeminarInput, type Seminar } from '../schema';
import { eq } from 'drizzle-orm';

export const getSeminar = async (input: GetSeminarInput): Promise<Seminar | null> => {
  try {
    // Join seminars with users to get speaker information
    const result = await db.select()
      .from(seminarsTable)
      .innerJoin(usersTable, eq(seminarsTable.speaker_id, usersTable.id))
      .where(eq(seminarsTable.id, input.id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    // Extract seminar data from the joined result
    const seminarData = result[0].seminars;
    
    return {
      ...seminarData,
      cost: seminarData.cost ? parseFloat(seminarData.cost) : null, // Convert numeric to number
    };
  } catch (error) {
    console.error('Seminar retrieval failed:', error);
    throw error;
  }
};