import { db } from '../db';
import { seminarsTable, usersTable } from '../db/schema';
import { type UpdateSeminarInput, type Seminar } from '../schema';
import { eq } from 'drizzle-orm';

export const updateSeminar = async (input: UpdateSeminarInput): Promise<Seminar | null> => {
  try {
    const { id, ...updateFields } = input;

    // Check if seminar exists
    const existingSeminar = await db.select()
      .from(seminarsTable)
      .where(eq(seminarsTable.id, id))
      .execute();

    if (existingSeminar.length === 0) {
      return null;
    }

    // If speaker_id is being updated, validate that the speaker exists and has 'speaker' role
    if (updateFields.speaker_id !== undefined) {
      const speaker = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, updateFields.speaker_id))
        .execute();

      if (speaker.length === 0) {
        throw new Error(`Speaker with id ${updateFields.speaker_id} does not exist`);
      }

      if (speaker[0].role !== 'speaker') {
        throw new Error(`User with id ${updateFields.speaker_id} does not have 'speaker' role`);
      }
    }

    // Prepare update object with numeric field conversions
    const updateData: any = { ...updateFields };
    if (updateData.cost !== undefined && updateData.cost !== null) {
      updateData.cost = updateData.cost.toString();
    }

    // Update seminar
    const result = await db.update(seminarsTable)
      .set(updateData)
      .where(eq(seminarsTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      return null;
    }

    // Convert numeric fields back to numbers before returning
    const seminar = result[0];
    return {
      ...seminar,
      cost: seminar.cost ? parseFloat(seminar.cost) : null
    };
  } catch (error) {
    console.error('Seminar update failed:', error);
    throw error;
  }
};