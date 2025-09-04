import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, seminarsTable, registrationsTable, attendanceTable } from '../db/schema';
import { type GetRegistrationsBySeminarInput, type CreateUserInput, type CreateSeminarInput, type CreateRegistrationInput, type UpdateAttendanceInput } from '../schema';
import { getAttendanceBySeminar } from '../handlers/get_attendance_by_seminar';

// Test data
const speakerData: CreateUserInput = {
  name: 'Dr. Speaker',
  email: 'speaker@test.com',
  role: 'speaker',
  password: 'password123'
};

const participantData1: CreateUserInput = {
  name: 'Participant One',
  email: 'participant1@test.com',
  role: 'participant',
  password: 'password123'
};

const participantData2: CreateUserInput = {
  name: 'Participant Two',
  email: 'participant2@test.com',
  role: 'participant',
  password: 'password123'
};

const seminarData: CreateSeminarInput = {
  title: 'Test Seminar',
  description: 'A seminar for testing attendance',
  date: new Date('2024-06-15'),
  time: '10:00 AM',
  location: 'Conference Room A',
  speaker_id: 1, // Will be updated after speaker creation
  capacity: 50,
  cost: null,
  registration_type: 'free'
};

const otherSeminarData: CreateSeminarInput = {
  title: 'Other Seminar',
  description: 'Another seminar',
  date: new Date('2024-06-20'),
  time: '2:00 PM',
  location: 'Conference Room B',
  speaker_id: 1, // Will be updated after speaker creation
  capacity: 30,
  cost: null,
  registration_type: 'free'
};

describe('getAttendanceBySeminar', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return attendance records for a specific seminar', async () => {
    // Create test users
    const [speaker] = await db.insert(usersTable)
      .values(speakerData)
      .returning()
      .execute();

    const [participant1] = await db.insert(usersTable)
      .values(participantData1)
      .returning()
      .execute();

    const [participant2] = await db.insert(usersTable)
      .values(participantData2)
      .returning()
      .execute();

    // Create seminar
    const [seminar] = await db.insert(seminarsTable)
      .values({ 
        ...seminarData, 
        speaker_id: speaker.id,
        cost: seminarData.cost?.toString() || null
      })
      .returning()
      .execute();

    // Create registrations
    const [registration1] = await db.insert(registrationsTable)
      .values({
        seminar_id: seminar.id,
        participant_id: participant1.id,
        status: 'approved'
      })
      .returning()
      .execute();

    const [registration2] = await db.insert(registrationsTable)
      .values({
        seminar_id: seminar.id,
        participant_id: participant2.id,
        status: 'approved'
      })
      .returning()
      .execute();

    // Create attendance records
    await db.insert(attendanceTable)
      .values({
        registration_id: registration1.id,
        attended: true,
        attendance_date: new Date('2024-06-15T10:00:00Z')
      })
      .execute();

    await db.insert(attendanceTable)
      .values({
        registration_id: registration2.id,
        attended: false,
        attendance_date: new Date('2024-06-15T10:00:00Z')
      })
      .execute();

    // Test the handler
    const input: GetRegistrationsBySeminarInput = {
      seminar_id: seminar.id
    };

    const result = await getAttendanceBySeminar(input);

    expect(result).toHaveLength(2);
    
    // Sort by registration_id for consistent testing
    result.sort((a, b) => a.registration_id - b.registration_id);

    // Verify first attendance record
    expect(result[0].registration_id).toEqual(registration1.id);
    expect(result[0].attended).toBe(true);
    expect(result[0].attendance_date).toBeInstanceOf(Date);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);

    // Verify second attendance record
    expect(result[1].registration_id).toEqual(registration2.id);
    expect(result[1].attended).toBe(false);
    expect(result[1].attendance_date).toBeInstanceOf(Date);
    expect(result[1].id).toBeDefined();
    expect(result[1].created_at).toBeInstanceOf(Date);
  });

  it('should return empty array when seminar has no attendance records', async () => {
    // Create test users
    const [speaker] = await db.insert(usersTable)
      .values(speakerData)
      .returning()
      .execute();

    const [participant] = await db.insert(usersTable)
      .values(participantData1)
      .returning()
      .execute();

    // Create seminar
    const [seminar] = await db.insert(seminarsTable)
      .values({ 
        ...seminarData, 
        speaker_id: speaker.id,
        cost: seminarData.cost?.toString() || null
      })
      .returning()
      .execute();

    // Create registration but no attendance
    await db.insert(registrationsTable)
      .values({
        seminar_id: seminar.id,
        participant_id: participant.id,
        status: 'approved'
      })
      .returning()
      .execute();

    // Test the handler
    const input: GetRegistrationsBySeminarInput = {
      seminar_id: seminar.id
    };

    const result = await getAttendanceBySeminar(input);

    expect(result).toHaveLength(0);
  });

  it('should return empty array when seminar does not exist', async () => {
    const input: GetRegistrationsBySeminarInput = {
      seminar_id: 999 // Non-existent seminar
    };

    const result = await getAttendanceBySeminar(input);

    expect(result).toHaveLength(0);
  });

  it('should only return attendance for the specified seminar', async () => {
    // Create test users
    const [speaker] = await db.insert(usersTable)
      .values(speakerData)
      .returning()
      .execute();

    const [participant1] = await db.insert(usersTable)
      .values(participantData1)
      .returning()
      .execute();

    const [participant2] = await db.insert(usersTable)
      .values(participantData2)
      .returning()
      .execute();

    // Create two seminars
    const [seminar1] = await db.insert(seminarsTable)
      .values({ 
        ...seminarData, 
        speaker_id: speaker.id,
        cost: seminarData.cost?.toString() || null
      })
      .returning()
      .execute();

    const [seminar2] = await db.insert(seminarsTable)
      .values({ 
        ...otherSeminarData, 
        speaker_id: speaker.id,
        cost: otherSeminarData.cost?.toString() || null
      })
      .returning()
      .execute();

    // Create registrations for both seminars
    const [registration1] = await db.insert(registrationsTable)
      .values({
        seminar_id: seminar1.id,
        participant_id: participant1.id,
        status: 'approved'
      })
      .returning()
      .execute();

    const [registration2] = await db.insert(registrationsTable)
      .values({
        seminar_id: seminar2.id,
        participant_id: participant2.id,
        status: 'approved'
      })
      .returning()
      .execute();

    // Create attendance records for both seminars
    await db.insert(attendanceTable)
      .values({
        registration_id: registration1.id,
        attended: true,
        attendance_date: new Date('2024-06-15T10:00:00Z')
      })
      .execute();

    await db.insert(attendanceTable)
      .values({
        registration_id: registration2.id,
        attended: true,
        attendance_date: new Date('2024-06-20T14:00:00Z')
      })
      .execute();

    // Test the handler for seminar1
    const input: GetRegistrationsBySeminarInput = {
      seminar_id: seminar1.id
    };

    const result = await getAttendanceBySeminar(input);

    expect(result).toHaveLength(1);
    expect(result[0].registration_id).toEqual(registration1.id);
    expect(result[0].attended).toBe(true);
  });

  it('should handle mixed attendance statuses correctly', async () => {
    // Create test users
    const [speaker] = await db.insert(usersTable)
      .values(speakerData)
      .returning()
      .execute();

    const [participant1] = await db.insert(usersTable)
      .values(participantData1)
      .returning()
      .execute();

    const [participant2] = await db.insert(usersTable)
      .values(participantData2)
      .returning()
      .execute();

    // Create seminar
    const [seminar] = await db.insert(seminarsTable)
      .values({ 
        ...seminarData, 
        speaker_id: speaker.id,
        cost: seminarData.cost?.toString() || null
      })
      .returning()
      .execute();

    // Create registrations
    const [registration1] = await db.insert(registrationsTable)
      .values({
        seminar_id: seminar.id,
        participant_id: participant1.id,
        status: 'approved'
      })
      .returning()
      .execute();

    const [registration2] = await db.insert(registrationsTable)
      .values({
        seminar_id: seminar.id,
        participant_id: participant2.id,
        status: 'approved'
      })
      .returning()
      .execute();

    // Create attendance records with different statuses
    await db.insert(attendanceTable)
      .values({
        registration_id: registration1.id,
        attended: true,
        attendance_date: new Date('2024-06-15T10:00:00Z')
      })
      .execute();

    await db.insert(attendanceTable)
      .values({
        registration_id: registration2.id,
        attended: false,
        attendance_date: new Date('2024-06-15T10:00:00Z')
      })
      .execute();

    // Test the handler
    const input: GetRegistrationsBySeminarInput = {
      seminar_id: seminar.id
    };

    const result = await getAttendanceBySeminar(input);

    expect(result).toHaveLength(2);
    
    // Check that we have both attended and non-attended records
    const attendedStatuses = result.map(r => r.attended);
    expect(attendedStatuses).toContain(true);
    expect(attendedStatuses).toContain(false);
  });
});