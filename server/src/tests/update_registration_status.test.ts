import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, seminarsTable, registrationsTable } from '../db/schema';
import { type UpdateRegistrationStatusInput } from '../schema';
import { updateRegistrationStatus } from '../handlers/update_registration_status';
import { eq } from 'drizzle-orm';

describe('updateRegistrationStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testSpeakerId: number;
  let testSeminarId: number;
  let testRegistrationId: number;

  beforeEach(async () => {
    // Create test speaker
    const speakerResult = await db.insert(usersTable)
      .values({
        name: 'Test Speaker',
        email: 'speaker@test.com',
        role: 'speaker',
        password: 'password123'
      })
      .returning()
      .execute();
    testSpeakerId = speakerResult[0].id;

    // Create test participant
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'user@test.com',
        role: 'participant',
        password: 'password123'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test seminar
    const seminarResult = await db.insert(seminarsTable)
      .values({
        title: 'Test Seminar',
        description: 'A test seminar',
        date: new Date('2024-12-25'),
        time: '10:00',
        location: 'Test Location',
        speaker_id: testSpeakerId,
        capacity: 50,
        cost: '25.00', // Store as string for numeric column
        registration_type: 'approval_required'
      })
      .returning()
      .execute();
    testSeminarId = seminarResult[0].id;

    // Create test registration
    const registrationResult = await db.insert(registrationsTable)
      .values({
        seminar_id: testSeminarId,
        participant_id: testUserId,
        status: 'pending'
      })
      .returning()
      .execute();
    testRegistrationId = registrationResult[0].id;
  });

  it('should update registration status to approved', async () => {
    const input: UpdateRegistrationStatusInput = {
      id: testRegistrationId,
      status: 'approved'
    };

    const result = await updateRegistrationStatus(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(testRegistrationId);
    expect(result!.status).toEqual('approved');
    expect(result!.seminar_id).toEqual(testSeminarId);
    expect(result!.participant_id).toEqual(testUserId);
    expect(result!.registration_date).toBeInstanceOf(Date);
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should update registration status to rejected', async () => {
    const input: UpdateRegistrationStatusInput = {
      id: testRegistrationId,
      status: 'rejected'
    };

    const result = await updateRegistrationStatus(input);

    expect(result).not.toBeNull();
    expect(result!.status).toEqual('rejected');
  });

  it('should update registration status to paid', async () => {
    const input: UpdateRegistrationStatusInput = {
      id: testRegistrationId,
      status: 'paid'
    };

    const result = await updateRegistrationStatus(input);

    expect(result).not.toBeNull();
    expect(result!.status).toEqual('paid');
  });

  it('should update registration status to cancelled', async () => {
    const input: UpdateRegistrationStatusInput = {
      id: testRegistrationId,
      status: 'cancelled'
    };

    const result = await updateRegistrationStatus(input);

    expect(result).not.toBeNull();
    expect(result!.status).toEqual('cancelled');
  });

  it('should save updated status to database', async () => {
    const input: UpdateRegistrationStatusInput = {
      id: testRegistrationId,
      status: 'approved'
    };

    await updateRegistrationStatus(input);

    // Verify the status was updated in the database
    const registrations = await db.select()
      .from(registrationsTable)
      .where(eq(registrationsTable.id, testRegistrationId))
      .execute();

    expect(registrations).toHaveLength(1);
    expect(registrations[0].status).toEqual('approved');
    expect(registrations[0].id).toEqual(testRegistrationId);
  });

  it('should return null for non-existent registration', async () => {
    const input: UpdateRegistrationStatusInput = {
      id: 99999, // Non-existent ID
      status: 'approved'
    };

    const result = await updateRegistrationStatus(input);

    expect(result).toBeNull();
  });

  it('should handle status transitions correctly', async () => {
    // Start with pending
    let result = await updateRegistrationStatus({
      id: testRegistrationId,
      status: 'approved'
    });
    expect(result!.status).toEqual('approved');

    // Change to paid
    result = await updateRegistrationStatus({
      id: testRegistrationId,
      status: 'paid'
    });
    expect(result!.status).toEqual('paid');

    // Change to cancelled
    result = await updateRegistrationStatus({
      id: testRegistrationId,
      status: 'cancelled'
    });
    expect(result!.status).toEqual('cancelled');
  });

  it('should maintain other registration fields unchanged', async () => {
    const input: UpdateRegistrationStatusInput = {
      id: testRegistrationId,
      status: 'approved'
    };

    const result = await updateRegistrationStatus(input);

    expect(result).not.toBeNull();
    expect(result!.seminar_id).toEqual(testSeminarId);
    expect(result!.participant_id).toEqual(testUserId);
    expect(result!.id).toEqual(testRegistrationId);
    // Should maintain original registration_date and created_at
    expect(result!.registration_date).toBeInstanceOf(Date);
    expect(result!.created_at).toBeInstanceOf(Date);
  });
});