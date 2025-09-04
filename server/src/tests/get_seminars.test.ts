import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, seminarsTable } from '../db/schema';
import { type CreateUserInput, type CreateSeminarInput } from '../schema';
import { getSeminars } from '../handlers/get_seminars';

// Test data
const testSpeaker: CreateUserInput = {
  name: 'Dr. Jane Smith',
  email: 'jane.smith@example.com',
  role: 'speaker',
  password: 'password123'
};

const testSeminar1: CreateSeminarInput = {
  title: 'Introduction to TypeScript',
  description: 'Learn the basics of TypeScript programming',
  date: new Date('2024-03-15T10:00:00Z'),
  time: '10:00 AM',
  location: 'Conference Room A',
  speaker_id: 1, // Will be set after creating speaker
  capacity: 50,
  cost: 25.99,
  registration_type: 'payment_required'
};

const testSeminar2: CreateSeminarInput = {
  title: 'Advanced JavaScript Patterns',
  description: 'Explore advanced patterns and techniques in JavaScript',
  date: new Date('2024-03-20T14:00:00Z'),
  time: '2:00 PM',
  location: 'Conference Room B',
  speaker_id: 1,
  capacity: 30,
  cost: null, // Free seminar
  registration_type: 'free'
};

describe('getSeminars', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no seminars exist', async () => {
    const result = await getSeminars();
    expect(result).toEqual([]);
  });

  it('should fetch all seminars with proper data types', async () => {
    // Create speaker first
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

    // Create seminars
    await db.insert(seminarsTable)
      .values([
        {
          title: testSeminar1.title,
          description: testSeminar1.description,
          date: testSeminar1.date,
          time: testSeminar1.time,
          location: testSeminar1.location,
          speaker_id: speakerId,
          capacity: testSeminar1.capacity,
          cost: testSeminar1.cost?.toString(), // Convert to string for numeric column
          registration_type: testSeminar1.registration_type
        },
        {
          title: testSeminar2.title,
          description: testSeminar2.description,
          date: testSeminar2.date,
          time: testSeminar2.time,
          location: testSeminar2.location,
          speaker_id: speakerId,
          capacity: testSeminar2.capacity,
          cost: null, // Free seminar
          registration_type: testSeminar2.registration_type
        }
      ])
      .execute();

    const result = await getSeminars();

    // Should return 2 seminars
    expect(result).toHaveLength(2);

    // Check first seminar (paid)
    const paidSeminar = result.find(s => s.title === 'Introduction to TypeScript');
    expect(paidSeminar).toBeDefined();
    expect(paidSeminar!.title).toEqual('Introduction to TypeScript');
    expect(paidSeminar!.description).toEqual('Learn the basics of TypeScript programming');
    expect(paidSeminar!.date).toBeInstanceOf(Date);
    expect(paidSeminar!.time).toEqual('10:00 AM');
    expect(paidSeminar!.location).toEqual('Conference Room A');
    expect(paidSeminar!.speaker_id).toEqual(speakerId);
    expect(paidSeminar!.capacity).toEqual(50);
    expect(paidSeminar!.cost).toEqual(25.99); // Should be converted to number
    expect(typeof paidSeminar!.cost).toBe('number');
    expect(paidSeminar!.registration_type).toEqual('payment_required');
    expect(paidSeminar!.created_at).toBeInstanceOf(Date);
    expect(paidSeminar!.id).toBeDefined();

    // Check second seminar (free)
    const freeSeminar = result.find(s => s.title === 'Advanced JavaScript Patterns');
    expect(freeSeminar).toBeDefined();
    expect(freeSeminar!.title).toEqual('Advanced JavaScript Patterns');
    expect(freeSeminar!.cost).toBeNull(); // Should remain null for free seminars
    expect(freeSeminar!.registration_type).toEqual('free');
  });

  it('should handle seminars with different cost values', async () => {
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

    // Create seminars with different cost scenarios
    await db.insert(seminarsTable)
      .values([
        {
          title: 'Free Workshop',
          description: 'Free workshop description',
          date: new Date(),
          time: '10:00 AM',
          location: 'Online',
          speaker_id: speakerId,
          capacity: 100,
          cost: null,
          registration_type: 'free'
        },
        {
          title: 'Paid Workshop',
          description: 'Paid workshop description',
          date: new Date(),
          time: '2:00 PM',
          location: 'Room 101',
          speaker_id: speakerId,
          capacity: 25,
          cost: '149.50', // String representation of decimal
          registration_type: 'payment_required'
        }
      ])
      .execute();

    const result = await getSeminars();
    expect(result).toHaveLength(2);

    const freeWorkshop = result.find(s => s.title === 'Free Workshop');
    const paidWorkshop = result.find(s => s.title === 'Paid Workshop');

    expect(freeWorkshop!.cost).toBeNull();
    expect(paidWorkshop!.cost).toEqual(149.50);
    expect(typeof paidWorkshop!.cost).toBe('number');
  });

  it('should maintain correct order and include all required fields', async () => {
    // Create speaker
    const speakerResult = await db.insert(usersTable)
      .values({
        name: 'Dr. Test Speaker',
        email: 'test.speaker@example.com',
        role: 'speaker',
        password: 'testpass123'
      })
      .returning()
      .execute();

    const speakerId = speakerResult[0].id;

    // Create a single seminar to test all fields
    await db.insert(seminarsTable)
      .values({
        title: 'Complete Seminar Test',
        description: 'Testing all seminar fields',
        date: new Date('2024-06-15T09:30:00Z'),
        time: '9:30 AM',
        location: 'Main Auditorium',
        speaker_id: speakerId,
        capacity: 200,
        cost: '99.99',
        registration_type: 'approval_required'
      })
      .execute();

    const result = await getSeminars();
    expect(result).toHaveLength(1);

    const seminar = result[0];

    // Verify all required fields are present and have correct types
    expect(typeof seminar.id).toBe('number');
    expect(typeof seminar.title).toBe('string');
    expect(typeof seminar.description).toBe('string');
    expect(seminar.date).toBeInstanceOf(Date);
    expect(typeof seminar.time).toBe('string');
    expect(typeof seminar.location).toBe('string');
    expect(typeof seminar.speaker_id).toBe('number');
    expect(typeof seminar.capacity).toBe('number');
    expect(typeof seminar.cost).toBe('number');
    expect(typeof seminar.registration_type).toBe('string');
    expect(seminar.created_at).toBeInstanceOf(Date);

    // Verify specific values
    expect(seminar.title).toEqual('Complete Seminar Test');
    expect(seminar.registration_type).toEqual('approval_required');
    expect(seminar.capacity).toEqual(200);
    expect(seminar.cost).toEqual(99.99);
  });
});