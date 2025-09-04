import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  seminarsTable, 
  registrationsTable, 
  attendanceTable, 
  certificatesTable 
} from '../db/schema';
import { type GetSeminarInput } from '../schema';
import { deleteSeminar } from '../handlers/delete_seminar';
import { eq } from 'drizzle-orm';

describe('deleteSeminar', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a seminar with no registrations', async () => {
    // Create a speaker user
    const speaker = await db.insert(usersTable).values({
      name: 'John Speaker',
      email: 'speaker@example.com',
      role: 'speaker',
      password: 'password123'
    }).returning().execute();

    // Create a seminar
    const seminar = await db.insert(seminarsTable).values({
      title: 'Test Seminar',
      description: 'A test seminar',
      date: new Date('2024-06-01'),
      time: '10:00',
      location: 'Conference Room A',
      speaker_id: speaker[0].id,
      capacity: 50,
      cost: '0',
      registration_type: 'free'
    }).returning().execute();

    const input: GetSeminarInput = {
      id: seminar[0].id
    };

    const result = await deleteSeminar(input);

    expect(result).toBe(true);

    // Verify seminar is deleted
    const seminars = await db.select()
      .from(seminarsTable)
      .where(eq(seminarsTable.id, seminar[0].id))
      .execute();

    expect(seminars).toHaveLength(0);
  });

  it('should delete a seminar with registrations and related data', async () => {
    // Create users
    const speaker = await db.insert(usersTable).values({
      name: 'John Speaker',
      email: 'speaker@example.com',
      role: 'speaker',
      password: 'password123'
    }).returning().execute();

    const participant = await db.insert(usersTable).values({
      name: 'Jane Participant',
      email: 'participant@example.com',
      role: 'participant',
      password: 'password123'
    }).returning().execute();

    // Create seminar
    const seminar = await db.insert(seminarsTable).values({
      title: 'Test Seminar',
      description: 'A test seminar',
      date: new Date('2024-06-01'),
      time: '10:00',
      location: 'Conference Room A',
      speaker_id: speaker[0].id,
      capacity: 50,
      cost: '25.00',
      registration_type: 'payment_required'
    }).returning().execute();

    // Create registration
    const registration = await db.insert(registrationsTable).values({
      seminar_id: seminar[0].id,
      participant_id: participant[0].id,
      status: 'paid'
    }).returning().execute();

    // Create attendance record
    await db.insert(attendanceTable).values({
      registration_id: registration[0].id,
      attended: true
    }).execute();

    // Create certificate
    await db.insert(certificatesTable).values({
      registration_id: registration[0].id,
      certificate_url: 'https://example.com/certificate.pdf'
    }).execute();

    const input: GetSeminarInput = {
      id: seminar[0].id
    };

    const result = await deleteSeminar(input);

    expect(result).toBe(true);

    // Verify all related data is deleted
    const seminars = await db.select()
      .from(seminarsTable)
      .where(eq(seminarsTable.id, seminar[0].id))
      .execute();
    expect(seminars).toHaveLength(0);

    const registrations = await db.select()
      .from(registrationsTable)
      .where(eq(registrationsTable.seminar_id, seminar[0].id))
      .execute();
    expect(registrations).toHaveLength(0);

    const attendance = await db.select()
      .from(attendanceTable)
      .where(eq(attendanceTable.registration_id, registration[0].id))
      .execute();
    expect(attendance).toHaveLength(0);

    const certificates = await db.select()
      .from(certificatesTable)
      .where(eq(certificatesTable.registration_id, registration[0].id))
      .execute();
    expect(certificates).toHaveLength(0);

    // Verify users are not deleted (should remain)
    const users = await db.select().from(usersTable).execute();
    expect(users).toHaveLength(2);
  });

  it('should delete seminar with multiple registrations', async () => {
    // Create users
    const speaker = await db.insert(usersTable).values({
      name: 'John Speaker',
      email: 'speaker@example.com',
      role: 'speaker',
      password: 'password123'
    }).returning().execute();

    const participants = await db.insert(usersTable).values([
      {
        name: 'Participant 1',
        email: 'participant1@example.com',
        role: 'participant',
        password: 'password123'
      },
      {
        name: 'Participant 2',
        email: 'participant2@example.com',
        role: 'participant',
        password: 'password123'
      }
    ]).returning().execute();

    // Create seminar
    const seminar = await db.insert(seminarsTable).values({
      title: 'Popular Seminar',
      description: 'A popular seminar with multiple registrations',
      date: new Date('2024-06-01'),
      time: '14:00',
      location: 'Main Hall',
      speaker_id: speaker[0].id,
      capacity: 100,
      cost: '50.00',
      registration_type: 'payment_required'
    }).returning().execute();

    // Create multiple registrations
    const registrations = await db.insert(registrationsTable).values([
      {
        seminar_id: seminar[0].id,
        participant_id: participants[0].id,
        status: 'paid'
      },
      {
        seminar_id: seminar[0].id,
        participant_id: participants[1].id,
        status: 'approved'
      }
    ]).returning().execute();

    // Create attendance for first registration
    await db.insert(attendanceTable).values({
      registration_id: registrations[0].id,
      attended: true
    }).execute();

    // Create certificate for first registration
    await db.insert(certificatesTable).values({
      registration_id: registrations[0].id,
      certificate_url: 'https://example.com/certificate1.pdf'
    }).execute();

    const input: GetSeminarInput = {
      id: seminar[0].id
    };

    const result = await deleteSeminar(input);

    expect(result).toBe(true);

    // Verify seminar is deleted
    const seminarsCheck = await db.select()
      .from(seminarsTable)
      .where(eq(seminarsTable.id, seminar[0].id))
      .execute();
    expect(seminarsCheck).toHaveLength(0);

    // Verify all registrations are deleted
    const registrationsCheck = await db.select()
      .from(registrationsTable)
      .where(eq(registrationsTable.seminar_id, seminar[0].id))
      .execute();
    expect(registrationsCheck).toHaveLength(0);

    // Verify related data is deleted
    const attendanceCheck = await db.select().from(attendanceTable).execute();
    expect(attendanceCheck).toHaveLength(0);

    const certificatesCheck = await db.select().from(certificatesTable).execute();
    expect(certificatesCheck).toHaveLength(0);
  });

  it('should return false when seminar does not exist', async () => {
    const input: GetSeminarInput = {
      id: 999 // Non-existent ID
    };

    const result = await deleteSeminar(input);

    expect(result).toBe(false);
  });

  it('should handle deletion of seminar with mixed registration statuses', async () => {
    // Create users
    const speaker = await db.insert(usersTable).values({
      name: 'John Speaker',
      email: 'speaker@example.com',
      role: 'speaker',
      password: 'password123'
    }).returning().execute();

    const participants = await db.insert(usersTable).values([
      {
        name: 'Participant 1',
        email: 'participant1@example.com',
        role: 'participant',
        password: 'password123'
      },
      {
        name: 'Participant 2',
        email: 'participant2@example.com',
        role: 'participant',
        password: 'password123'
      },
      {
        name: 'Participant 3',
        email: 'participant3@example.com',
        role: 'participant',
        password: 'password123'
      }
    ]).returning().execute();

    // Create seminar
    const seminar = await db.insert(seminarsTable).values({
      title: 'Mixed Status Seminar',
      description: 'A seminar with various registration statuses',
      date: new Date('2024-07-15'),
      time: '09:00',
      location: 'Room B',
      speaker_id: speaker[0].id,
      capacity: 30,
      cost: '15.00',
      registration_type: 'approval_required'
    }).returning().execute();

    // Create registrations with different statuses
    await db.insert(registrationsTable).values([
      {
        seminar_id: seminar[0].id,
        participant_id: participants[0].id,
        status: 'approved'
      },
      {
        seminar_id: seminar[0].id,
        participant_id: participants[1].id,
        status: 'pending'
      },
      {
        seminar_id: seminar[0].id,
        participant_id: participants[2].id,
        status: 'rejected'
      }
    ]).execute();

    const input: GetSeminarInput = {
      id: seminar[0].id
    };

    const result = await deleteSeminar(input);

    expect(result).toBe(true);

    // Verify everything is deleted
    const seminarsCheck = await db.select()
      .from(seminarsTable)
      .where(eq(seminarsTable.id, seminar[0].id))
      .execute();
    expect(seminarsCheck).toHaveLength(0);

    const registrationsCheck = await db.select()
      .from(registrationsTable)
      .where(eq(registrationsTable.seminar_id, seminar[0].id))
      .execute();
    expect(registrationsCheck).toHaveLength(0);
  });
});