import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, seminarsTable, registrationsTable } from '../db/schema';
import { type GetRegistrationsByUserInput } from '../schema';
import { getRegistrationsByUser } from '../handlers/get_registrations_by_user';

describe('getRegistrationsByUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const createTestData = async () => {
    // Create test users
    const participantResult = await db.insert(usersTable)
      .values({
        name: 'Test Participant',
        email: 'participant@example.com',
        role: 'participant',
        password: 'password123'
      })
      .returning()
      .execute();

    const speakerResult = await db.insert(usersTable)
      .values({
        name: 'Test Speaker',
        email: 'speaker@example.com',
        role: 'speaker',
        password: 'password123'
      })
      .returning()
      .execute();

    const anotherParticipantResult = await db.insert(usersTable)
      .values({
        name: 'Another Participant',
        email: 'another@example.com',
        role: 'participant',
        password: 'password123'
      })
      .returning()
      .execute();

    // Create test seminar
    const seminarResult = await db.insert(seminarsTable)
      .values({
        title: 'Test Seminar',
        description: 'A test seminar',
        date: new Date('2024-06-01'),
        time: '10:00 AM',
        location: 'Conference Room A',
        speaker_id: speakerResult[0].id,
        capacity: 50,
        cost: '25.00',
        registration_type: 'free'
      })
      .returning()
      .execute();

    const anotherSeminarResult = await db.insert(seminarsTable)
      .values({
        title: 'Another Seminar',
        description: 'Another test seminar',
        date: new Date('2024-06-15'),
        time: '2:00 PM',
        location: 'Conference Room B',
        speaker_id: speakerResult[0].id,
        capacity: 30,
        cost: '15.00',
        registration_type: 'approval_required'
      })
      .returning()
      .execute();

    return {
      participant: participantResult[0],
      speaker: speakerResult[0],
      anotherParticipant: anotherParticipantResult[0],
      seminar: seminarResult[0],
      anotherSeminar: anotherSeminarResult[0]
    };
  };

  it('should return registrations for a specific user', async () => {
    const testData = await createTestData();

    // Create registrations for the test participant
    await db.insert(registrationsTable)
      .values([
        {
          seminar_id: testData.seminar.id,
          participant_id: testData.participant.id,
          status: 'approved'
        },
        {
          seminar_id: testData.anotherSeminar.id,
          participant_id: testData.participant.id,
          status: 'pending'
        }
      ])
      .execute();

    // Create registration for another participant (should not be returned)
    await db.insert(registrationsTable)
      .values({
        seminar_id: testData.seminar.id,
        participant_id: testData.anotherParticipant.id,
        status: 'approved'
      })
      .execute();

    const input: GetRegistrationsByUserInput = {
      participant_id: testData.participant.id
    };

    const result = await getRegistrationsByUser(input);

    expect(result).toHaveLength(2);
    
    // Verify all registrations belong to the correct participant
    result.forEach(registration => {
      expect(registration.participant_id).toEqual(testData.participant.id);
      expect(registration.id).toBeDefined();
      expect(registration.seminar_id).toBeDefined();
      expect(registration.registration_date).toBeInstanceOf(Date);
      expect(registration.created_at).toBeInstanceOf(Date);
      expect(['approved', 'pending']).toContain(registration.status);
    });

    // Verify specific seminar associations
    const seminarIds = result.map(r => r.seminar_id).sort();
    expect(seminarIds).toEqual([testData.seminar.id, testData.anotherSeminar.id].sort());
  });

  it('should return empty array for user with no registrations', async () => {
    const testData = await createTestData();

    const input: GetRegistrationsByUserInput = {
      participant_id: testData.anotherParticipant.id
    };

    const result = await getRegistrationsByUser(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for non-existent user', async () => {
    await createTestData();

    const input: GetRegistrationsByUserInput = {
      participant_id: 999
    };

    const result = await getRegistrationsByUser(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle registrations with different statuses', async () => {
    const testData = await createTestData();

    // Create registrations with various statuses
    await db.insert(registrationsTable)
      .values([
        {
          seminar_id: testData.seminar.id,
          participant_id: testData.participant.id,
          status: 'pending'
        },
        {
          seminar_id: testData.anotherSeminar.id,
          participant_id: testData.participant.id,
          status: 'approved'
        }
      ])
      .execute();

    const input: GetRegistrationsByUserInput = {
      participant_id: testData.participant.id
    };

    const result = await getRegistrationsByUser(input);

    expect(result).toHaveLength(2);
    
    const statuses = result.map(r => r.status);
    expect(statuses).toContain('pending');
    expect(statuses).toContain('approved');
  });

  it('should return registrations with proper date handling', async () => {
    const testData = await createTestData();

    await db.insert(registrationsTable)
      .values({
        seminar_id: testData.seminar.id,
        participant_id: testData.participant.id,
        status: 'approved'
      })
      .execute();

    const input: GetRegistrationsByUserInput = {
      participant_id: testData.participant.id
    };

    const result = await getRegistrationsByUser(input);

    expect(result).toHaveLength(1);
    expect(result[0].registration_date).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
    
    // Verify dates are reasonable (within last minute)
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    expect(result[0].registration_date >= oneMinuteAgo).toBe(true);
    expect(result[0].created_at >= oneMinuteAgo).toBe(true);
  });
});