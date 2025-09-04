import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, seminarsTable } from '../db/schema';
import { type UpdateSeminarInput, type CreateUserInput } from '../schema';
import { updateSeminar } from '../handlers/update_seminar';
import { eq } from 'drizzle-orm';

// Test data for creating users
const testSpeaker: CreateUserInput = {
  name: 'Dr. John Speaker',
  email: 'john.speaker@example.com',
  role: 'speaker',
  password: 'password123'
};

const testParticipant: CreateUserInput = {
  name: 'Jane Participant',
  email: 'jane.participant@example.com',
  role: 'participant',
  password: 'password123'
};

const testAnotherSpeaker: CreateUserInput = {
  name: 'Dr. Alice Speaker',
  email: 'alice.speaker@example.com',
  role: 'speaker',
  password: 'password123'
};

describe('updateSeminar', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update basic seminar fields', async () => {
    // Create speaker
    const speakerResult = await db.insert(usersTable)
      .values({
        name: testSpeaker.name,
        email: testSpeaker.email,
        role: testSpeaker.role,
        password: testSpeaker.password
      })
      .returning()
      .execute();

    const speakerId = speakerResult[0].id;

    // Create seminar
    const seminarResult = await db.insert(seminarsTable)
      .values({
        title: 'Original Title',
        description: 'Original description',
        date: new Date('2024-12-01'),
        time: '10:00 AM',
        location: 'Room 101',
        speaker_id: speakerId,
        capacity: 50,
        cost: '25.00',
        registration_type: 'free'
      })
      .returning()
      .execute();

    const seminarId = seminarResult[0].id;

    // Update seminar
    const updateInput: UpdateSeminarInput = {
      id: seminarId,
      title: 'Updated Title',
      description: 'Updated description',
      capacity: 75
    };

    const result = await updateSeminar(updateInput);

    expect(result).toBeDefined();
    expect(result!.title).toEqual('Updated Title');
    expect(result!.description).toEqual('Updated description');
    expect(result!.capacity).toEqual(75);
    expect(result!.speaker_id).toEqual(speakerId);
    expect(result!.cost).toEqual(25.00);
  });

  it('should update seminar cost with numeric conversion', async () => {
    // Create speaker
    const speakerResult = await db.insert(usersTable)
      .values({
        name: testSpeaker.name,
        email: testSpeaker.email,
        role: testSpeaker.role,
        password: testSpeaker.password
      })
      .returning()
      .execute();

    const speakerId = speakerResult[0].id;

    // Create seminar
    const seminarResult = await db.insert(seminarsTable)
      .values({
        title: 'Test Seminar',
        description: 'Test description',
        date: new Date('2024-12-01'),
        time: '10:00 AM',
        location: 'Room 101',
        speaker_id: speakerId,
        capacity: 50,
        cost: '25.00',
        registration_type: 'payment_required'
      })
      .returning()
      .execute();

    const seminarId = seminarResult[0].id;

    // Update cost
    const updateInput: UpdateSeminarInput = {
      id: seminarId,
      cost: 49.99
    };

    const result = await updateSeminar(updateInput);

    expect(result).toBeDefined();
    expect(result!.cost).toEqual(49.99);
    expect(typeof result!.cost).toBe('number');
  });

  it('should update seminar cost to null', async () => {
    // Create speaker
    const speakerResult = await db.insert(usersTable)
      .values({
        name: testSpeaker.name,
        email: testSpeaker.email,
        role: testSpeaker.role,
        password: testSpeaker.password
      })
      .returning()
      .execute();

    const speakerId = speakerResult[0].id;

    // Create paid seminar
    const seminarResult = await db.insert(seminarsTable)
      .values({
        title: 'Paid Seminar',
        description: 'A paid seminar',
        date: new Date('2024-12-01'),
        time: '10:00 AM',
        location: 'Room 101',
        speaker_id: speakerId,
        capacity: 50,
        cost: '25.00',
        registration_type: 'payment_required'
      })
      .returning()
      .execute();

    const seminarId = seminarResult[0].id;

    // Update cost to null (make it free)
    const updateInput: UpdateSeminarInput = {
      id: seminarId,
      cost: null,
      registration_type: 'free'
    };

    const result = await updateSeminar(updateInput);

    expect(result).toBeDefined();
    expect(result!.cost).toBeNull();
    expect(result!.registration_type).toEqual('free');
  });

  it('should update speaker_id when new speaker exists and has speaker role', async () => {
    // Create original speaker
    const originalSpeakerResult = await db.insert(usersTable)
      .values({
        name: testSpeaker.name,
        email: testSpeaker.email,
        role: testSpeaker.role,
        password: testSpeaker.password
      })
      .returning()
      .execute();

    const originalSpeakerId = originalSpeakerResult[0].id;

    // Create new speaker
    const newSpeakerResult = await db.insert(usersTable)
      .values({
        name: testAnotherSpeaker.name,
        email: testAnotherSpeaker.email,
        role: testAnotherSpeaker.role,
        password: testAnotherSpeaker.password
      })
      .returning()
      .execute();

    const newSpeakerId = newSpeakerResult[0].id;

    // Create seminar
    const seminarResult = await db.insert(seminarsTable)
      .values({
        title: 'Test Seminar',
        description: 'Test description',
        date: new Date('2024-12-01'),
        time: '10:00 AM',
        location: 'Room 101',
        speaker_id: originalSpeakerId,
        capacity: 50,
        registration_type: 'free'
      })
      .returning()
      .execute();

    const seminarId = seminarResult[0].id;

    // Update speaker
    const updateInput: UpdateSeminarInput = {
      id: seminarId,
      speaker_id: newSpeakerId
    };

    const result = await updateSeminar(updateInput);

    expect(result).toBeDefined();
    expect(result!.speaker_id).toEqual(newSpeakerId);
  });

  it('should save updated seminar to database', async () => {
    // Create speaker
    const speakerResult = await db.insert(usersTable)
      .values({
        name: testSpeaker.name,
        email: testSpeaker.email,
        role: testSpeaker.role,
        password: testSpeaker.password
      })
      .returning()
      .execute();

    const speakerId = speakerResult[0].id;

    // Create seminar
    const seminarResult = await db.insert(seminarsTable)
      .values({
        title: 'Original Title',
        description: 'Original description',
        date: new Date('2024-12-01'),
        time: '10:00 AM',
        location: 'Room 101',
        speaker_id: speakerId,
        capacity: 50,
        registration_type: 'free'
      })
      .returning()
      .execute();

    const seminarId = seminarResult[0].id;

    // Update seminar
    const updateInput: UpdateSeminarInput = {
      id: seminarId,
      title: 'Updated Title',
      location: 'Room 202'
    };

    await updateSeminar(updateInput);

    // Verify changes were saved to database
    const updatedSeminar = await db.select()
      .from(seminarsTable)
      .where(eq(seminarsTable.id, seminarId))
      .execute();

    expect(updatedSeminar).toHaveLength(1);
    expect(updatedSeminar[0].title).toEqual('Updated Title');
    expect(updatedSeminar[0].location).toEqual('Room 202');
    expect(updatedSeminar[0].description).toEqual('Original description');
  });

  it('should return null when seminar does not exist', async () => {
    const updateInput: UpdateSeminarInput = {
      id: 999,
      title: 'Updated Title'
    };

    const result = await updateSeminar(updateInput);

    expect(result).toBeNull();
  });

  it('should throw error when speaker_id does not exist', async () => {
    // Create speaker
    const speakerResult = await db.insert(usersTable)
      .values({
        name: testSpeaker.name,
        email: testSpeaker.email,
        role: testSpeaker.role,
        password: testSpeaker.password
      })
      .returning()
      .execute();

    const speakerId = speakerResult[0].id;

    // Create seminar
    const seminarResult = await db.insert(seminarsTable)
      .values({
        title: 'Test Seminar',
        description: 'Test description',
        date: new Date('2024-12-01'),
        time: '10:00 AM',
        location: 'Room 101',
        speaker_id: speakerId,
        capacity: 50,
        registration_type: 'free'
      })
      .returning()
      .execute();

    const seminarId = seminarResult[0].id;

    // Try to update with non-existent speaker
    const updateInput: UpdateSeminarInput = {
      id: seminarId,
      speaker_id: 999
    };

    await expect(updateSeminar(updateInput)).rejects.toThrow(/speaker with id 999 does not exist/i);
  });

  it('should throw error when user does not have speaker role', async () => {
    // Create speaker
    const speakerResult = await db.insert(usersTable)
      .values({
        name: testSpeaker.name,
        email: testSpeaker.email,
        role: testSpeaker.role,
        password: testSpeaker.password
      })
      .returning()
      .execute();

    const speakerId = speakerResult[0].id;

    // Create participant (non-speaker)
    const participantResult = await db.insert(usersTable)
      .values({
        name: testParticipant.name,
        email: testParticipant.email,
        role: testParticipant.role,
        password: testParticipant.password
      })
      .returning()
      .execute();

    const participantId = participantResult[0].id;

    // Create seminar
    const seminarResult = await db.insert(seminarsTable)
      .values({
        title: 'Test Seminar',
        description: 'Test description',
        date: new Date('2024-12-01'),
        time: '10:00 AM',
        location: 'Room 101',
        speaker_id: speakerId,
        capacity: 50,
        registration_type: 'free'
      })
      .returning()
      .execute();

    const seminarId = seminarResult[0].id;

    // Try to update with participant as speaker
    const updateInput: UpdateSeminarInput = {
      id: seminarId,
      speaker_id: participantId
    };

    await expect(updateSeminar(updateInput)).rejects.toThrow(/user with id .* does not have 'speaker' role/i);
  });
});