import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { seminarsTable, usersTable } from '../db/schema';
import { type CreateSeminarInput, type CreateUserInput } from '../schema';
import { createSeminar } from '../handlers/create_seminar';
import { eq } from 'drizzle-orm';

// Helper function to create a speaker user
const createSpeaker = async (): Promise<number> => {
  const result = await db.insert(usersTable)
    .values({
      name: 'Dr. Jane Smith',
      email: 'speaker@example.com',
      role: 'speaker',
      password: 'password123'
    })
    .returning()
    .execute();
  return result[0].id;
};

// Helper function to create a non-speaker user
const createParticipant = async (): Promise<number> => {
  const result = await db.insert(usersTable)
    .values({
      name: 'John Doe',
      email: 'participant@example.com',
      role: 'participant',
      password: 'password123'
    })
    .returning()
    .execute();
  return result[0].id;
};

// Test input with all required fields
const baseSeminarInput = {
  title: 'Advanced TypeScript Workshop',
  description: 'Learn advanced TypeScript patterns and best practices',
  date: new Date('2024-06-15T10:00:00Z'),
  time: '10:00 AM - 4:00 PM',
  location: 'Conference Room A',
  speaker_id: 1, // Will be set dynamically in tests
  capacity: 50,
  cost: 99.99,
  registration_type: 'payment_required' as const
};

describe('createSeminar', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a seminar with valid speaker', async () => {
    const speakerId = await createSpeaker();
    const testInput: CreateSeminarInput = {
      ...baseSeminarInput,
      speaker_id: speakerId
    };

    const result = await createSeminar(testInput);

    // Verify all fields are returned correctly
    expect(result.title).toEqual('Advanced TypeScript Workshop');
    expect(result.description).toEqual(testInput.description);
    expect(result.date).toEqual(testInput.date);
    expect(result.time).toEqual('10:00 AM - 4:00 PM');
    expect(result.location).toEqual('Conference Room A');
    expect(result.speaker_id).toEqual(speakerId);
    expect(result.capacity).toEqual(50);
    expect(result.cost).toEqual(99.99);
    expect(typeof result.cost).toEqual('number');
    expect(result.registration_type).toEqual('payment_required');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a free seminar with null cost', async () => {
    const speakerId = await createSpeaker();
    const testInput: CreateSeminarInput = {
      ...baseSeminarInput,
      speaker_id: speakerId,
      cost: null,
      registration_type: 'free'
    };

    const result = await createSeminar(testInput);

    expect(result.cost).toBeNull();
    expect(result.registration_type).toEqual('free');
  });

  it('should create a seminar with zero cost', async () => {
    const speakerId = await createSpeaker();
    const testInput: CreateSeminarInput = {
      ...baseSeminarInput,
      speaker_id: speakerId,
      cost: 0,
      registration_type: 'free'
    };

    const result = await createSeminar(testInput);

    expect(result.cost).toEqual(0);
    expect(typeof result.cost).toEqual('number');
  });

  it('should save seminar to database correctly', async () => {
    const speakerId = await createSpeaker();
    const testInput: CreateSeminarInput = {
      ...baseSeminarInput,
      speaker_id: speakerId
    };

    const result = await createSeminar(testInput);

    // Query the database to verify the seminar was saved
    const seminars = await db.select()
      .from(seminarsTable)
      .where(eq(seminarsTable.id, result.id))
      .execute();

    expect(seminars).toHaveLength(1);
    expect(seminars[0].title).toEqual('Advanced TypeScript Workshop');
    expect(seminars[0].description).toEqual(testInput.description);
    expect(seminars[0].speaker_id).toEqual(speakerId);
    expect(seminars[0].capacity).toEqual(50);
    expect(parseFloat(seminars[0].cost!)).toEqual(99.99); // Database stores as string
    expect(seminars[0].registration_type).toEqual('payment_required');
    expect(seminars[0].created_at).toBeInstanceOf(Date);
  });

  it('should use Zod default values correctly', async () => {
    const speakerId = await createSpeaker();
    const minimalInput: CreateSeminarInput = {
      title: 'Basic Workshop',
      description: 'A simple workshop',
      date: new Date('2024-07-01T14:00:00Z'),
      time: '2:00 PM - 5:00 PM',
      location: 'Room B',
      speaker_id: speakerId,
      capacity: 25,
      cost: 0, // Zod default
      registration_type: 'free' // Zod default
    };

    const result = await createSeminar(minimalInput);

    expect(result.cost).toEqual(0); // Zod default
    expect(result.registration_type).toEqual('free'); // Zod default
  });

  it('should throw error when speaker does not exist', async () => {
    const testInput: CreateSeminarInput = {
      ...baseSeminarInput,
      speaker_id: 99999 // Non-existent ID
    };

    await expect(createSeminar(testInput)).rejects.toThrow(/Speaker with ID 99999 not found/i);
  });

  it('should throw error when user is not a speaker', async () => {
    const participantId = await createParticipant();
    const testInput: CreateSeminarInput = {
      ...baseSeminarInput,
      speaker_id: participantId
    };

    await expect(createSeminar(testInput)).rejects.toThrow(/is not a speaker/i);
  });

  it('should handle different registration types correctly', async () => {
    const speakerId = await createSpeaker();
    
    // Test approval_required type
    const approvalInput: CreateSeminarInput = {
      ...baseSeminarInput,
      speaker_id: speakerId,
      registration_type: 'approval_required',
      cost: null
    };

    const approvalResult = await createSeminar(approvalInput);
    expect(approvalResult.registration_type).toEqual('approval_required');
    expect(approvalResult.cost).toBeNull();
  });

  it('should handle decimal costs correctly', async () => {
    const speakerId = await createSpeaker();
    const testInput: CreateSeminarInput = {
      ...baseSeminarInput,
      speaker_id: speakerId,
      cost: 49.95 // Test decimal precision
    };

    const result = await createSeminar(testInput);

    expect(result.cost).toEqual(49.95);
    expect(typeof result.cost).toEqual('number');

    // Verify in database
    const seminars = await db.select()
      .from(seminarsTable)
      .where(eq(seminarsTable.id, result.id))
      .execute();

    expect(parseFloat(seminars[0].cost!)).toEqual(49.95);
  });
});