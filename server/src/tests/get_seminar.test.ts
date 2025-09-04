import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, seminarsTable } from '../db/schema';
import { type GetSeminarInput } from '../schema';
import { getSeminar } from '../handlers/get_seminar';

describe('getSeminar', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a seminar by id with numeric cost conversion', async () => {
    // Create a speaker user first
    const speakerResult = await db.insert(usersTable)
      .values({
        name: 'Dr. John Speaker',
        email: 'speaker@test.com',
        role: 'speaker',
        password: 'password123'
      })
      .returning()
      .execute();

    const speaker = speakerResult[0];

    // Create a seminar with cost
    const seminarResult = await db.insert(seminarsTable)
      .values({
        title: 'Advanced TypeScript',
        description: 'Learn advanced TypeScript concepts',
        date: new Date('2024-06-15'),
        time: '10:00',
        location: 'Conference Room A',
        speaker_id: speaker.id,
        capacity: 50,
        cost: '99.99', // Insert as string for numeric column
        registration_type: 'payment_required'
      })
      .returning()
      .execute();

    const createdSeminar = seminarResult[0];

    const input: GetSeminarInput = { id: createdSeminar.id };
    const result = await getSeminar(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdSeminar.id);
    expect(result!.title).toEqual('Advanced TypeScript');
    expect(result!.description).toEqual('Learn advanced TypeScript concepts');
    expect(result!.date).toBeInstanceOf(Date);
    expect(result!.time).toEqual('10:00');
    expect(result!.location).toEqual('Conference Room A');
    expect(result!.speaker_id).toEqual(speaker.id);
    expect(result!.capacity).toEqual(50);
    expect(result!.cost).toEqual(99.99); // Should be converted to number
    expect(typeof result!.cost).toEqual('number'); // Verify numeric conversion
    expect(result!.registration_type).toEqual('payment_required');
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return a seminar with null cost', async () => {
    // Create a speaker user first
    const speakerResult = await db.insert(usersTable)
      .values({
        name: 'Jane Teacher',
        email: 'teacher@test.com',
        role: 'speaker',
        password: 'password123'
      })
      .returning()
      .execute();

    const speaker = speakerResult[0];

    // Create a free seminar (null cost)
    const seminarResult = await db.insert(seminarsTable)
      .values({
        title: 'Free Workshop',
        description: 'A free introduction workshop',
        date: new Date('2024-07-20'),
        time: '14:00',
        location: 'Online',
        speaker_id: speaker.id,
        capacity: 100,
        cost: null, // Free seminar
        registration_type: 'free'
      })
      .returning()
      .execute();

    const createdSeminar = seminarResult[0];

    const input: GetSeminarInput = { id: createdSeminar.id };
    const result = await getSeminar(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdSeminar.id);
    expect(result!.title).toEqual('Free Workshop');
    expect(result!.cost).toBeNull(); // Should remain null
    expect(result!.registration_type).toEqual('free');
  });

  it('should return null for non-existent seminar', async () => {
    const input: GetSeminarInput = { id: 999 };
    const result = await getSeminar(input);

    expect(result).toBeNull();
  });

  it('should handle seminars with different registration types', async () => {
    // Create a speaker user first
    const speakerResult = await db.insert(usersTable)
      .values({
        name: 'Prof. Smith',
        email: 'prof.smith@test.com',
        role: 'speaker',
        password: 'password123'
      })
      .returning()
      .execute();

    const speaker = speakerResult[0];

    // Create a seminar requiring approval
    const seminarResult = await db.insert(seminarsTable)
      .values({
        title: 'Exclusive Masterclass',
        description: 'Limited seats masterclass',
        date: new Date('2024-08-10'),
        time: '09:00',
        location: 'VIP Room',
        speaker_id: speaker.id,
        capacity: 20,
        cost: '299.50', // Insert as string
        registration_type: 'approval_required'
      })
      .returning()
      .execute();

    const createdSeminar = seminarResult[0];

    const input: GetSeminarInput = { id: createdSeminar.id };
    const result = await getSeminar(input);

    expect(result).not.toBeNull();
    expect(result!.title).toEqual('Exclusive Masterclass');
    expect(result!.cost).toEqual(299.50); // Proper numeric conversion
    expect(result!.registration_type).toEqual('approval_required');
    expect(result!.capacity).toEqual(20);
  });

  it('should verify join with speaker table works correctly', async () => {
    // Create multiple users including speakers
    const usersResult = await db.insert(usersTable)
      .values([
        {
          name: 'Main Speaker',
          email: 'main@test.com',
          role: 'speaker',
          password: 'password123'
        },
        {
          name: 'Regular User',
          email: 'user@test.com',
          role: 'participant',
          password: 'password123'
        }
      ])
      .returning()
      .execute();

    const mainSpeaker = usersResult[0];

    // Create seminar with specific speaker
    const seminarResult = await db.insert(seminarsTable)
      .values({
        title: 'Database Design',
        description: 'Learn database design principles',
        date: new Date('2024-09-05'),
        time: '11:30',
        location: 'Lab 1',
        speaker_id: mainSpeaker.id,
        capacity: 30,
        cost: '150.00',
        registration_type: 'payment_required'
      })
      .returning()
      .execute();

    const createdSeminar = seminarResult[0];

    const input: GetSeminarInput = { id: createdSeminar.id };
    const result = await getSeminar(input);

    expect(result).not.toBeNull();
    expect(result!.speaker_id).toEqual(mainSpeaker.id);
    expect(result!.title).toEqual('Database Design');
    // Verify that the join worked by confirming we got the correct speaker_id
    expect(result!.speaker_id).not.toEqual(usersResult[1].id); // Not the participant
  });
});