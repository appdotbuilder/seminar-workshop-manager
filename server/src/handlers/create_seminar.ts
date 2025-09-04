import { db } from '../db';
import { seminarsTable, usersTable } from '../db/schema';
import { type CreateSeminarInput, type Seminar } from '../schema';
import { eq } from 'drizzle-orm';

export const createSeminar = async (input: CreateSeminarInput): Promise<Seminar> => {
  try {
    // Validate that speaker_id exists and has 'speaker' role
    const speaker = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.speaker_id))
      .execute();

    if (speaker.length === 0) {
      throw new Error(`Speaker with ID ${input.speaker_id} not found`);
    }

    if (speaker[0].role !== 'speaker') {
      throw new Error(`User with ID ${input.speaker_id} is not a speaker (role: ${speaker[0].role})`);
    }

    // Insert seminar record
    const result = await db.insert(seminarsTable)
      .values({
        title: input.title,
        description: input.description,
        date: input.date,
        time: input.time,
        location: input.location,
        speaker_id: input.speaker_id,
        capacity: input.capacity,
        cost: input.cost !== null && input.cost !== undefined ? input.cost.toString() : null, // Convert number to string for numeric column
        registration_type: input.registration_type
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const seminar = result[0];
    return {
      ...seminar,
      cost: seminar.cost ? parseFloat(seminar.cost) : null // Convert string back to number
    };
  } catch (error) {
    console.error('Seminar creation failed:', error);
    throw error;
  }
};