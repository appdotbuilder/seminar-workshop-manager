import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, seminarsTable, registrationsTable, attendanceTable } from '../db/schema';
import { type UpdateAttendanceInput } from '../schema';
import { updateAttendance } from '../handlers/update_attendance';
import { eq } from 'drizzle-orm';

// Test data
const testSpeaker = {
  name: 'Test Speaker',
  email: 'speaker@test.com',
  role: 'speaker' as const,
  password: 'password123'
};

const testParticipant = {
  name: 'Test Participant',
  email: 'participant@test.com',
  role: 'participant' as const,
  password: 'password123'
};

const testSeminar = {
  title: 'Test Seminar',
  description: 'A test seminar',
  date: new Date('2024-06-01'),
  time: '10:00 AM',
  location: 'Test Location',
  capacity: 50,
  cost: '0',
  registration_type: 'free' as const
};

const approvedRegistration = {
  status: 'approved' as const
};

const paidRegistration = {
  status: 'paid' as const
};

const pendingRegistration = {
  status: 'pending' as const
};

describe('updateAttendance', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create new attendance record for approved registration', async () => {
    // Create prerequisite data
    const speakers = await db.insert(usersTable).values(testSpeaker).returning().execute();
    const participants = await db.insert(usersTable).values(testParticipant).returning().execute();
    const seminars = await db.insert(seminarsTable)
      .values({ ...testSeminar, speaker_id: speakers[0].id })
      .returning()
      .execute();
    const registrations = await db.insert(registrationsTable)
      .values({
        seminar_id: seminars[0].id,
        participant_id: participants[0].id,
        ...approvedRegistration
      })
      .returning()
      .execute();

    const input: UpdateAttendanceInput = {
      registration_id: registrations[0].id,
      attended: true
    };

    const result = await updateAttendance(input);

    // Verify attendance record
    expect(result.registration_id).toBe(registrations[0].id);
    expect(result.attended).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.attendance_date).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create attendance record for paid registration', async () => {
    // Create prerequisite data
    const speakers = await db.insert(usersTable).values(testSpeaker).returning().execute();
    const participants = await db.insert(usersTable).values(testParticipant).returning().execute();
    const seminars = await db.insert(seminarsTable)
      .values({ ...testSeminar, speaker_id: speakers[0].id })
      .returning()
      .execute();
    const registrations = await db.insert(registrationsTable)
      .values({
        seminar_id: seminars[0].id,
        participant_id: participants[0].id,
        ...paidRegistration
      })
      .returning()
      .execute();

    const input: UpdateAttendanceInput = {
      registration_id: registrations[0].id,
      attended: false
    };

    const result = await updateAttendance(input);

    expect(result.registration_id).toBe(registrations[0].id);
    expect(result.attended).toBe(false);
    expect(result.id).toBeDefined();
  });

  it('should update existing attendance record', async () => {
    // Create prerequisite data
    const speakers = await db.insert(usersTable).values(testSpeaker).returning().execute();
    const participants = await db.insert(usersTable).values(testParticipant).returning().execute();
    const seminars = await db.insert(seminarsTable)
      .values({ ...testSeminar, speaker_id: speakers[0].id })
      .returning()
      .execute();
    const registrations = await db.insert(registrationsTable)
      .values({
        seminar_id: seminars[0].id,
        participant_id: participants[0].id,
        ...approvedRegistration
      })
      .returning()
      .execute();

    // Create initial attendance record
    const initialInput: UpdateAttendanceInput = {
      registration_id: registrations[0].id,
      attended: false
    };
    await updateAttendance(initialInput);

    // Update attendance record
    const updateInput: UpdateAttendanceInput = {
      registration_id: registrations[0].id,
      attended: true
    };
    const result = await updateAttendance(updateInput);

    expect(result.registration_id).toBe(registrations[0].id);
    expect(result.attended).toBe(true);

    // Verify only one attendance record exists
    const attendanceRecords = await db.select()
      .from(attendanceTable)
      .where(eq(attendanceTable.registration_id, registrations[0].id))
      .execute();
    
    expect(attendanceRecords).toHaveLength(1);
    expect(attendanceRecords[0].attended).toBe(true);
  });

  it('should save attendance to database correctly', async () => {
    // Create prerequisite data
    const speakers = await db.insert(usersTable).values(testSpeaker).returning().execute();
    const participants = await db.insert(usersTable).values(testParticipant).returning().execute();
    const seminars = await db.insert(seminarsTable)
      .values({ ...testSeminar, speaker_id: speakers[0].id })
      .returning()
      .execute();
    const registrations = await db.insert(registrationsTable)
      .values({
        seminar_id: seminars[0].id,
        participant_id: participants[0].id,
        ...approvedRegistration
      })
      .returning()
      .execute();

    const input: UpdateAttendanceInput = {
      registration_id: registrations[0].id,
      attended: true
    };

    const result = await updateAttendance(input);

    // Query database directly to verify
    const attendance = await db.select()
      .from(attendanceTable)
      .where(eq(attendanceTable.id, result.id))
      .execute();

    expect(attendance).toHaveLength(1);
    expect(attendance[0].registration_id).toBe(registrations[0].id);
    expect(attendance[0].attended).toBe(true);
    expect(attendance[0].attendance_date).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent registration', async () => {
    const input: UpdateAttendanceInput = {
      registration_id: 99999,
      attended: true
    };

    await expect(updateAttendance(input)).rejects.toThrow(/registration not found/i);
  });

  it('should throw error for pending registration', async () => {
    // Create prerequisite data
    const speakers = await db.insert(usersTable).values(testSpeaker).returning().execute();
    const participants = await db.insert(usersTable).values(testParticipant).returning().execute();
    const seminars = await db.insert(seminarsTable)
      .values({ ...testSeminar, speaker_id: speakers[0].id })
      .returning()
      .execute();
    const registrations = await db.insert(registrationsTable)
      .values({
        seminar_id: seminars[0].id,
        participant_id: participants[0].id,
        ...pendingRegistration
      })
      .returning()
      .execute();

    const input: UpdateAttendanceInput = {
      registration_id: registrations[0].id,
      attended: true
    };

    await expect(updateAttendance(input)).rejects.toThrow(/must be approved or paid/i);
  });

  it('should throw error for rejected registration', async () => {
    // Create prerequisite data
    const speakers = await db.insert(usersTable).values(testSpeaker).returning().execute();
    const participants = await db.insert(usersTable).values(testParticipant).returning().execute();
    const seminars = await db.insert(seminarsTable)
      .values({ ...testSeminar, speaker_id: speakers[0].id })
      .returning()
      .execute();
    const registrations = await db.insert(registrationsTable)
      .values({
        seminar_id: seminars[0].id,
        participant_id: participants[0].id,
        status: 'rejected' as const
      })
      .returning()
      .execute();

    const input: UpdateAttendanceInput = {
      registration_id: registrations[0].id,
      attended: true
    };

    await expect(updateAttendance(input)).rejects.toThrow(/must be approved or paid/i);
  });

  it('should handle marking participant as not attended', async () => {
    // Create prerequisite data
    const speakers = await db.insert(usersTable).values(testSpeaker).returning().execute();
    const participants = await db.insert(usersTable).values(testParticipant).returning().execute();
    const seminars = await db.insert(seminarsTable)
      .values({ ...testSeminar, speaker_id: speakers[0].id })
      .returning()
      .execute();
    const registrations = await db.insert(registrationsTable)
      .values({
        seminar_id: seminars[0].id,
        participant_id: participants[0].id,
        ...approvedRegistration
      })
      .returning()
      .execute();

    const input: UpdateAttendanceInput = {
      registration_id: registrations[0].id,
      attended: false
    };

    const result = await updateAttendance(input);

    expect(result.attended).toBe(false);
    expect(result.registration_id).toBe(registrations[0].id);
  });
});