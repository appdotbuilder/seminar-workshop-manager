import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, seminarsTable, registrationsTable } from '../db/schema';
import { type CreateRegistrationInput } from '../schema';
import { createRegistration } from '../handlers/create_registration';
import { eq, and } from 'drizzle-orm';

describe('createRegistration', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup
  let speakerId: number;
  let participantId: number;
  let freeSeminarId: number;
  let approvalRequiredSeminarId: number;

  beforeEach(async () => {
    // Create a speaker user
    const speaker = await db.insert(usersTable)
      .values({
        name: 'Dr. Speaker',
        email: 'speaker@test.com',
        role: 'speaker',
        password: 'password123'
      })
      .returning()
      .execute();
    speakerId = speaker[0].id;

    // Create a participant user
    const participant = await db.insert(usersTable)
      .values({
        name: 'Test Participant',
        email: 'participant@test.com',
        role: 'participant',
        password: 'password123'
      })
      .returning()
      .execute();
    participantId = participant[0].id;

    // Create a free seminar
    const freeSeminar = await db.insert(seminarsTable)
      .values({
        title: 'Free Seminar',
        description: 'A free test seminar',
        date: new Date('2024-12-31'),
        time: '10:00',
        location: 'Test Room',
        speaker_id: speakerId,
        capacity: 2,
        cost: null,
        registration_type: 'free'
      })
      .returning()
      .execute();
    freeSeminarId = freeSeminar[0].id;

    // Create an approval required seminar
    const approvalSeminar = await db.insert(seminarsTable)
      .values({
        title: 'Approval Required Seminar',
        description: 'A seminar requiring approval',
        date: new Date('2024-12-31'),
        time: '14:00',
        location: 'Test Room 2',
        speaker_id: speakerId,
        capacity: 1,
        cost: '25.00',
        registration_type: 'approval_required'
      })
      .returning()
      .execute();
    approvalRequiredSeminarId = approvalSeminar[0].id;
  });

  it('should create registration for free seminar with approved status', async () => {
    const input: CreateRegistrationInput = {
      seminar_id: freeSeminarId,
      participant_id: participantId,
      status: 'pending' // This should be overridden to 'approved' for free seminars
    };

    const result = await createRegistration(input);

    expect(result.seminar_id).toEqual(freeSeminarId);
    expect(result.participant_id).toEqual(participantId);
    expect(result.status).toEqual('approved'); // Should be automatically approved for free seminars
    expect(result.id).toBeDefined();
    expect(result.registration_date).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create registration for approval required seminar with pending status', async () => {
    const input: CreateRegistrationInput = {
      seminar_id: approvalRequiredSeminarId,
      participant_id: participantId,
      status: 'approved' // This should be overridden to 'pending'
    };

    const result = await createRegistration(input);

    expect(result.seminar_id).toEqual(approvalRequiredSeminarId);
    expect(result.participant_id).toEqual(participantId);
    expect(result.status).toEqual('pending'); // Should be pending for approval required seminars
    expect(result.id).toBeDefined();
    expect(result.registration_date).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save registration to database', async () => {
    const input: CreateRegistrationInput = {
      seminar_id: freeSeminarId,
      participant_id: participantId,
      status: 'pending'
    };

    const result = await createRegistration(input);

    // Verify registration was saved to database
    const savedRegistrations = await db.select()
      .from(registrationsTable)
      .where(eq(registrationsTable.id, result.id))
      .execute();

    expect(savedRegistrations).toHaveLength(1);
    expect(savedRegistrations[0].seminar_id).toEqual(freeSeminarId);
    expect(savedRegistrations[0].participant_id).toEqual(participantId);
    expect(savedRegistrations[0].status).toEqual('approved');
  });

  it('should throw error when participant does not exist', async () => {
    const input: CreateRegistrationInput = {
      seminar_id: freeSeminarId,
      participant_id: 9999, // Non-existent participant
      status: 'pending'
    };

    await expect(createRegistration(input)).rejects.toThrow(/participant not found/i);
  });

  it('should throw error when seminar does not exist', async () => {
    const input: CreateRegistrationInput = {
      seminar_id: 9999, // Non-existent seminar
      participant_id: participantId,
      status: 'pending'
    };

    await expect(createRegistration(input)).rejects.toThrow(/seminar not found/i);
  });

  it('should throw error when user is not a participant', async () => {
    // Create a speaker user (not participant)
    const nonParticipant = await db.insert(usersTable)
      .values({
        name: 'Another Speaker',
        email: 'speaker2@test.com',
        role: 'speaker',
        password: 'password123'
      })
      .returning()
      .execute();

    const input: CreateRegistrationInput = {
      seminar_id: freeSeminarId,
      participant_id: nonParticipant[0].id,
      status: 'pending'
    };

    await expect(createRegistration(input)).rejects.toThrow(/must have participant role/i);
  });

  it('should throw error when participant is already registered', async () => {
    // Create first registration
    const input: CreateRegistrationInput = {
      seminar_id: freeSeminarId,
      participant_id: participantId,
      status: 'pending'
    };

    await createRegistration(input);

    // Try to register again
    await expect(createRegistration(input)).rejects.toThrow(/already registered/i);
  });

  it('should throw error when seminar is at capacity', async () => {
    // Create another participant
    const participant2 = await db.insert(usersTable)
      .values({
        name: 'Second Participant',
        email: 'participant2@test.com',
        role: 'participant',
        password: 'password123'
      })
      .returning()
      .execute();

    // Fill up the capacity (capacity is 1 for approval required seminar)
    await db.insert(registrationsTable)
      .values({
        seminar_id: approvalRequiredSeminarId,
        participant_id: participant2[0].id,
        status: 'approved'
      })
      .execute();

    const input: CreateRegistrationInput = {
      seminar_id: approvalRequiredSeminarId,
      participant_id: participantId,
      status: 'pending'
    };

    await expect(createRegistration(input)).rejects.toThrow(/at capacity/i);
  });

  it('should allow registration when capacity includes cancelled registrations', async () => {
    // Create another participant
    const participant2 = await db.insert(usersTable)
      .values({
        name: 'Second Participant',
        email: 'participant2@test.com',
        role: 'participant',
        password: 'password123'
      })
      .returning()
      .execute();

    // Create a cancelled registration (shouldn't count toward capacity)
    await db.insert(registrationsTable)
      .values({
        seminar_id: approvalRequiredSeminarId,
        participant_id: participant2[0].id,
        status: 'cancelled'
      })
      .execute();

    const input: CreateRegistrationInput = {
      seminar_id: approvalRequiredSeminarId,
      participant_id: participantId,
      status: 'pending'
    };

    // Should succeed because cancelled registration doesn't count toward capacity
    const result = await createRegistration(input);
    expect(result.status).toEqual('pending');
  });

  it('should handle payment required seminars with pending status', async () => {
    // Create a payment required seminar
    const paymentSeminar = await db.insert(seminarsTable)
      .values({
        title: 'Payment Required Seminar',
        description: 'A seminar requiring payment',
        date: new Date('2024-12-31'),
        time: '16:00',
        location: 'Test Room 3',
        speaker_id: speakerId,
        capacity: 5,
        cost: '50.00',
        registration_type: 'payment_required'
      })
      .returning()
      .execute();

    const input: CreateRegistrationInput = {
      seminar_id: paymentSeminar[0].id,
      participant_id: participantId,
      status: 'approved' // Should be overridden to pending
    };

    const result = await createRegistration(input);
    expect(result.status).toEqual('pending');
  });
});