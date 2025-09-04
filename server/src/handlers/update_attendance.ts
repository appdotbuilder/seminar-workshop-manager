import { db } from '../db';
import { attendanceTable, registrationsTable } from '../db/schema';
import { type UpdateAttendanceInput, type Attendance } from '../schema';
import { eq } from 'drizzle-orm';

export const updateAttendance = async (input: UpdateAttendanceInput): Promise<Attendance> => {
  try {
    // First verify that the registration exists and is in valid status
    const registration = await db.select()
      .from(registrationsTable)
      .where(eq(registrationsTable.id, input.registration_id))
      .execute();

    if (registration.length === 0) {
      throw new Error('Registration not found');
    }

    const registrationRecord = registration[0];
    
    // Check if registration is in a valid status for attendance tracking
    if (registrationRecord.status !== 'approved' && registrationRecord.status !== 'paid') {
      throw new Error('Registration must be approved or paid to track attendance');
    }

    // Check if attendance record already exists
    const existingAttendance = await db.select()
      .from(attendanceTable)
      .where(eq(attendanceTable.registration_id, input.registration_id))
      .execute();

    if (existingAttendance.length > 0) {
      // Update existing attendance record
      const result = await db.update(attendanceTable)
        .set({
          attended: input.attended,
          attendance_date: new Date()
        })
        .where(eq(attendanceTable.registration_id, input.registration_id))
        .returning()
        .execute();

      return result[0];
    } else {
      // Create new attendance record
      const result = await db.insert(attendanceTable)
        .values({
          registration_id: input.registration_id,
          attended: input.attended,
          attendance_date: new Date()
        })
        .returning()
        .execute();

      return result[0];
    }
  } catch (error) {
    console.error('Attendance update failed:', error);
    throw error;
  }
};