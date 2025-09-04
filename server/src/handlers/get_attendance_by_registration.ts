import { db } from '../db';
import { attendanceTable } from '../db/schema';
import { type GetAttendanceByRegistrationInput, type Attendance } from '../schema';
import { eq } from 'drizzle-orm';

export const getAttendanceByRegistration = async (input: GetAttendanceByRegistrationInput): Promise<Attendance | null> => {
  try {
    // Query attendance record for the specific registration
    const result = await db.select()
      .from(attendanceTable)
      .where(eq(attendanceTable.registration_id, input.registration_id))
      .execute();

    // Return null if no attendance record found
    if (result.length === 0) {
      return null;
    }

    // Return the attendance record (first match since registration_id should be unique)
    return result[0];
  } catch (error) {
    console.error('Get attendance by registration failed:', error);
    throw error;
  }
};