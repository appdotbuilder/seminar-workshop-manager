import { db } from '../db';
import { attendanceTable, registrationsTable } from '../db/schema';
import { type GetRegistrationsBySeminarInput, type Attendance } from '../schema';
import { eq } from 'drizzle-orm';

export const getAttendanceBySeminar = async (input: GetRegistrationsBySeminarInput): Promise<Attendance[]> => {
  try {
    // Query attendance records for all registrations of the specified seminar
    const results = await db.select()
      .from(attendanceTable)
      .innerJoin(registrationsTable, eq(attendanceTable.registration_id, registrationsTable.id))
      .where(eq(registrationsTable.seminar_id, input.seminar_id))
      .execute();

    // Map the joined results to return Attendance objects
    return results.map(result => ({
      id: result.attendance.id,
      registration_id: result.attendance.registration_id,
      attended: result.attendance.attended,
      attendance_date: result.attendance.attendance_date,
      created_at: result.attendance.created_at
    }));
  } catch (error) {
    console.error('Get attendance by seminar failed:', error);
    throw error;
  }
};