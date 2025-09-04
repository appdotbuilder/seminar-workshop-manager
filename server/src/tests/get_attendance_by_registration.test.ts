import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, seminarsTable, registrationsTable, attendanceTable } from '../db/schema';
import { type GetAttendanceByRegistrationInput } from '../schema';
import { getAttendanceByRegistration } from '../handlers/get_attendance_by_registration';

describe('getAttendanceByRegistration', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return attendance record when it exists', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test Speaker',
        email: 'speaker@example.com',
        role: 'speaker',
        password: 'password123'
      })
      .returning()
      .execute();

    const participantResult = await db.insert(usersTable)
      .values({
        name: 'Test Participant',
        email: 'participant@example.com',
        role: 'participant',
        password: 'password123'
      })
      .returning()
      .execute();

    const seminarResult = await db.insert(seminarsTable)
      .values({
        title: 'Test Seminar',
        description: 'A test seminar',
        date: new Date('2024-12-31'),
        time: '10:00',
        location: 'Test Location',
        speaker_id: userResult[0].id,
        capacity: 50,
        cost: '0',
        registration_type: 'free'
      })
      .returning()
      .execute();

    const registrationResult = await db.insert(registrationsTable)
      .values({
        seminar_id: seminarResult[0].id,
        participant_id: participantResult[0].id,
        status: 'approved'
      })
      .returning()
      .execute();

    // Create attendance record
    const attendanceResult = await db.insert(attendanceTable)
      .values({
        registration_id: registrationResult[0].id,
        attended: true
      })
      .returning()
      .execute();

    const testInput: GetAttendanceByRegistrationInput = {
      registration_id: registrationResult[0].id
    };

    // Test the handler
    const result = await getAttendanceByRegistration(testInput);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(attendanceResult[0].id);
    expect(result!.registration_id).toEqual(registrationResult[0].id);
    expect(result!.attended).toEqual(true);
    expect(result!.attendance_date).toBeInstanceOf(Date);
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return null when attendance record does not exist', async () => {
    const testInput: GetAttendanceByRegistrationInput = {
      registration_id: 99999 // Non-existent registration ID
    };

    const result = await getAttendanceByRegistration(testInput);

    expect(result).toBeNull();
  });

  it('should return attendance record with attended false', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test Speaker',
        email: 'speaker@example.com',
        role: 'speaker',
        password: 'password123'
      })
      .returning()
      .execute();

    const participantResult = await db.insert(usersTable)
      .values({
        name: 'Test Participant',
        email: 'participant@example.com',
        role: 'participant',
        password: 'password123'
      })
      .returning()
      .execute();

    const seminarResult = await db.insert(seminarsTable)
      .values({
        title: 'Test Seminar',
        description: 'A test seminar',
        date: new Date('2024-12-31'),
        time: '10:00',
        location: 'Test Location',
        speaker_id: userResult[0].id,
        capacity: 50,
        cost: '0',
        registration_type: 'free'
      })
      .returning()
      .execute();

    const registrationResult = await db.insert(registrationsTable)
      .values({
        seminar_id: seminarResult[0].id,
        participant_id: participantResult[0].id,
        status: 'approved'
      })
      .returning()
      .execute();

    // Create attendance record with attended = false
    const attendanceResult = await db.insert(attendanceTable)
      .values({
        registration_id: registrationResult[0].id,
        attended: false
      })
      .returning()
      .execute();

    const testInput: GetAttendanceByRegistrationInput = {
      registration_id: registrationResult[0].id
    };

    // Test the handler
    const result = await getAttendanceByRegistration(testInput);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(attendanceResult[0].id);
    expect(result!.registration_id).toEqual(registrationResult[0].id);
    expect(result!.attended).toEqual(false);
    expect(result!.attendance_date).toBeInstanceOf(Date);
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should handle valid registration ID with no attendance record', async () => {
    // Create prerequisite data without attendance
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test Speaker',
        email: 'speaker@example.com',
        role: 'speaker',
        password: 'password123'
      })
      .returning()
      .execute();

    const participantResult = await db.insert(usersTable)
      .values({
        name: 'Test Participant',
        email: 'participant@example.com',
        role: 'participant',
        password: 'password123'
      })
      .returning()
      .execute();

    const seminarResult = await db.insert(seminarsTable)
      .values({
        title: 'Test Seminar',
        description: 'A test seminar',
        date: new Date('2024-12-31'),
        time: '10:00',
        location: 'Test Location',
        speaker_id: userResult[0].id,
        capacity: 50,
        cost: '0',
        registration_type: 'free'
      })
      .returning()
      .execute();

    const registrationResult = await db.insert(registrationsTable)
      .values({
        seminar_id: seminarResult[0].id,
        participant_id: participantResult[0].id,
        status: 'approved'
      })
      .returning()
      .execute();

    // No attendance record created
    const testInput: GetAttendanceByRegistrationInput = {
      registration_id: registrationResult[0].id
    };

    const result = await getAttendanceByRegistration(testInput);

    expect(result).toBeNull();
  });
});