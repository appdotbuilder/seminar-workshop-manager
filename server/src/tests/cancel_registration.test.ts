import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, seminarsTable, registrationsTable } from '../db/schema';
import { type UpdateRegistrationStatusInput } from '../schema';
import { cancelRegistration } from '../handlers/cancel_registration';
import { eq } from 'drizzle-orm';

describe('cancelRegistration', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should cancel a registration', async () => {
    // Create test user (participant)
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test Participant',
        email: 'participant@test.com',
        role: 'participant',
        password: 'password123'
      })
      .returning()
      .execute();

    // Create test user (speaker)
    const speakerResult = await db.insert(usersTable)
      .values({
        name: 'Test Speaker',
        email: 'speaker@test.com',
        role: 'speaker',
        password: 'password123'
      })
      .returning()
      .execute();

    // Create test seminar
    const seminarResult = await db.insert(seminarsTable)
      .values({
        title: 'Test Seminar',
        description: 'A seminar for testing',
        date: new Date('2024-12-31'),
        time: '10:00',
        location: 'Test Location',
        speaker_id: speakerResult[0].id,
        capacity: 50,
        cost: '25.00', // Convert to string for numeric column
        registration_type: 'payment_required'
      })
      .returning()
      .execute();

    // Create test registration
    const registrationResult = await db.insert(registrationsTable)
      .values({
        seminar_id: seminarResult[0].id,
        participant_id: userResult[0].id,
        status: 'approved'
      })
      .returning()
      .execute();

    const input: UpdateRegistrationStatusInput = {
      id: registrationResult[0].id,
      status: 'cancelled'
    };

    const result = await cancelRegistration(input);

    expect(result).toBe(true);

    // Verify the registration status was updated
    const updatedRegistration = await db.select()
      .from(registrationsTable)
      .where(eq(registrationsTable.id, registrationResult[0].id))
      .execute();

    expect(updatedRegistration).toHaveLength(1);
    expect(updatedRegistration[0].status).toEqual('cancelled');
  });

  it('should return false for non-existent registration', async () => {
    const input: UpdateRegistrationStatusInput = {
      id: 999, // Non-existent ID
      status: 'cancelled'
    };

    const result = await cancelRegistration(input);

    expect(result).toBe(false);
  });

  it('should cancel registration with different initial statuses', async () => {
    // Create test user (participant)
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test Participant',
        email: 'participant@test.com',
        role: 'participant',
        password: 'password123'
      })
      .returning()
      .execute();

    // Create test user (speaker)
    const speakerResult = await db.insert(usersTable)
      .values({
        name: 'Test Speaker',
        email: 'speaker@test.com',
        role: 'speaker',
        password: 'password123'
      })
      .returning()
      .execute();

    // Create test seminar
    const seminarResult = await db.insert(seminarsTable)
      .values({
        title: 'Test Seminar',
        description: 'A seminar for testing',
        date: new Date('2024-12-31'),
        time: '10:00',
        location: 'Test Location',
        speaker_id: speakerResult[0].id,
        capacity: 50,
        cost: null, // Free event
        registration_type: 'free'
      })
      .returning()
      .execute();

    // Test cancelling a pending registration
    const pendingRegistrationResult = await db.insert(registrationsTable)
      .values({
        seminar_id: seminarResult[0].id,
        participant_id: userResult[0].id,
        status: 'pending'
      })
      .returning()
      .execute();

    const pendingInput: UpdateRegistrationStatusInput = {
      id: pendingRegistrationResult[0].id,
      status: 'cancelled'
    };

    const pendingResult = await cancelRegistration(pendingInput);

    expect(pendingResult).toBe(true);

    // Verify the pending registration was cancelled
    const cancelledRegistration = await db.select()
      .from(registrationsTable)
      .where(eq(registrationsTable.id, pendingRegistrationResult[0].id))
      .execute();

    expect(cancelledRegistration[0].status).toEqual('cancelled');
  });

  it('should handle already cancelled registration', async () => {
    // Create test user (participant)
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test Participant',
        email: 'participant@test.com',
        role: 'participant',
        password: 'password123'
      })
      .returning()
      .execute();

    // Create test user (speaker)
    const speakerResult = await db.insert(usersTable)
      .values({
        name: 'Test Speaker',
        email: 'speaker@test.com',
        role: 'speaker',
        password: 'password123'
      })
      .returning()
      .execute();

    // Create test seminar
    const seminarResult = await db.insert(seminarsTable)
      .values({
        title: 'Test Seminar',
        description: 'A seminar for testing',
        date: new Date('2024-12-31'),
        time: '10:00',
        location: 'Test Location',
        speaker_id: speakerResult[0].id,
        capacity: 50,
        cost: null, // Free event
        registration_type: 'free'
      })
      .returning()
      .execute();

    // Create already cancelled registration
    const registrationResult = await db.insert(registrationsTable)
      .values({
        seminar_id: seminarResult[0].id,
        participant_id: userResult[0].id,
        status: 'cancelled'
      })
      .returning()
      .execute();

    const input: UpdateRegistrationStatusInput = {
      id: registrationResult[0].id,
      status: 'cancelled'
    };

    const result = await cancelRegistration(input);

    expect(result).toBe(true);

    // Verify the registration is still cancelled
    const registration = await db.select()
      .from(registrationsTable)
      .where(eq(registrationsTable.id, registrationResult[0].id))
      .execute();

    expect(registration[0].status).toEqual('cancelled');
  });
});