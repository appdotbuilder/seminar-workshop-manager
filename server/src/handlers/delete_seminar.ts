import { db } from '../db';
import { 
  seminarsTable, 
  registrationsTable, 
  attendanceTable, 
  certificatesTable 
} from '../db/schema';
import { type GetSeminarInput } from '../schema';
import { eq } from 'drizzle-orm';

export const deleteSeminar = async (input: GetSeminarInput): Promise<boolean> => {
  try {
    // First, check if the seminar exists
    const seminar = await db.select()
      .from(seminarsTable)
      .where(eq(seminarsTable.id, input.id))
      .execute();

    if (seminar.length === 0) {
      return false; // Seminar doesn't exist
    }

    // Get all registrations for this seminar
    const registrations = await db.select()
      .from(registrationsTable)
      .where(eq(registrationsTable.seminar_id, input.id))
      .execute();

    const registrationIds = registrations.map(reg => reg.id);

    // Delete certificates for all registrations (if any)
    if (registrationIds.length > 0) {
      for (const regId of registrationIds) {
        await db.delete(certificatesTable)
          .where(eq(certificatesTable.registration_id, regId))
          .execute();
      }

      // Delete attendance records for all registrations
      for (const regId of registrationIds) {
        await db.delete(attendanceTable)
          .where(eq(attendanceTable.registration_id, regId))
          .execute();
      }

      // Delete all registrations for this seminar
      await db.delete(registrationsTable)
        .where(eq(registrationsTable.seminar_id, input.id))
        .execute();
    }

    // Finally, delete the seminar itself
    await db.delete(seminarsTable)
      .where(eq(seminarsTable.id, input.id))
      .execute();

    return true;
  } catch (error) {
    console.error('Seminar deletion failed:', error);
    throw error;
  }
};