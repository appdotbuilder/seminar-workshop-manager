import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, seminarsTable, registrationsTable } from '../db/schema';
import { getRegistrations } from '../handlers/get_registrations';

describe('getRegistrations', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no registrations exist', async () => {
    const result = await getRegistrations();
    expect(result).toEqual([]);
  });

  it('should return all registrations with joined data', async () => {
    // Create test speaker user
    const [speaker] = await db.insert(usersTable)
      .values({
        name: 'John Speaker',
        email: 'speaker@test.com',
        role: 'speaker',
        password: 'password123'
      })
      .returning()
      .execute();

    // Create test participant user
    const [participant] = await db.insert(usersTable)
      .values({
        name: 'Jane Participant',
        email: 'participant@test.com',
        role: 'participant',
        password: 'password123'
      })
      .returning()
      .execute();

    // Create test seminar
    const [seminar] = await db.insert(seminarsTable)
      .values({
        title: 'Test Seminar',
        description: 'A test seminar',
        date: new Date('2024-06-15'),
        time: '10:00',
        location: 'Conference Room A',
        speaker_id: speaker.id,
        capacity: 50,
        cost: '99.99',
        registration_type: 'payment_required'
      })
      .returning()
      .execute();

    // Create test registration
    const [registration] = await db.insert(registrationsTable)
      .values({
        seminar_id: seminar.id,
        participant_id: participant.id,
        status: 'approved'
      })
      .returning()
      .execute();

    const result = await getRegistrations();

    expect(result).toHaveLength(1);
    
    const reg = result[0];
    expect(reg.id).toBe(registration.id);
    expect(reg.seminar_id).toBe(seminar.id);
    expect(reg.participant_id).toBe(participant.id);
    expect(reg.status).toBe('approved');
    expect(reg.registration_date).toBeInstanceOf(Date);
    expect(reg.created_at).toBeInstanceOf(Date);

    // Verify joined data is included
    expect((reg as any).seminar_title).toBe('Test Seminar');
    expect((reg as any).seminar_date).toBeInstanceOf(Date);
    expect((reg as any).seminar_location).toBe('Conference Room A');
    expect((reg as any).seminar_cost).toBe(99.99); // Numeric conversion
    expect((reg as any).participant_name).toBe('Jane Participant');
    expect((reg as any).participant_email).toBe('participant@test.com');
  });

  it('should handle multiple registrations correctly', async () => {
    // Create test users
    const [speaker] = await db.insert(usersTable)
      .values({
        name: 'John Speaker',
        email: 'speaker@test.com',
        role: 'speaker',
        password: 'password123'
      })
      .returning()
      .execute();

    const [participant1] = await db.insert(usersTable)
      .values({
        name: 'Jane Participant',
        email: 'participant1@test.com',
        role: 'participant',
        password: 'password123'
      })
      .returning()
      .execute();

    const [participant2] = await db.insert(usersTable)
      .values({
        name: 'Bob Participant',
        email: 'participant2@test.com',
        role: 'participant',
        password: 'password123'
      })
      .returning()
      .execute();

    // Create test seminars
    const [seminar1] = await db.insert(seminarsTable)
      .values({
        title: 'Seminar One',
        description: 'First seminar',
        date: new Date('2024-06-15'),
        time: '10:00',
        location: 'Room A',
        speaker_id: speaker.id,
        capacity: 50,
        cost: '50.00',
        registration_type: 'payment_required'
      })
      .returning()
      .execute();

    const [seminar2] = await db.insert(seminarsTable)
      .values({
        title: 'Seminar Two',
        description: 'Second seminar',
        date: new Date('2024-06-16'),
        time: '14:00',
        location: 'Room B',
        speaker_id: speaker.id,
        capacity: 30,
        cost: null, // Free seminar
        registration_type: 'free'
      })
      .returning()
      .execute();

    // Create multiple registrations
    await db.insert(registrationsTable)
      .values([
        {
          seminar_id: seminar1.id,
          participant_id: participant1.id,
          status: 'approved'
        },
        {
          seminar_id: seminar1.id,
          participant_id: participant2.id,
          status: 'pending'
        },
        {
          seminar_id: seminar2.id,
          participant_id: participant1.id,
          status: 'approved'
        }
      ])
      .execute();

    const result = await getRegistrations();

    expect(result).toHaveLength(3);

    // Verify different registration statuses
    const statuses = result.map(r => r.status);
    expect(statuses).toContain('approved');
    expect(statuses).toContain('pending');

    // Verify different seminars are included
    const seminarTitles = result.map(r => (r as any).seminar_title);
    expect(seminarTitles).toContain('Seminar One');
    expect(seminarTitles).toContain('Seminar Two');

    // Verify different participants are included
    const participantNames = result.map(r => (r as any).participant_name);
    expect(participantNames).toContain('Jane Participant');
    expect(participantNames).toContain('Bob Participant');

    // Verify cost handling (free vs paid)
    const costs = result.map(r => (r as any).seminar_cost);
    expect(costs).toContain(50.00);
    expect(costs).toContain(null);
  });

  it('should handle registrations with different statuses', async () => {
    // Create prerequisite data
    const [speaker] = await db.insert(usersTable)
      .values({
        name: 'Speaker',
        email: 'speaker@test.com',
        role: 'speaker',
        password: 'password123'
      })
      .returning()
      .execute();

    const [participant] = await db.insert(usersTable)
      .values({
        name: 'Participant',
        email: 'participant@test.com',
        role: 'participant',
        password: 'password123'
      })
      .returning()
      .execute();

    const [seminar] = await db.insert(seminarsTable)
      .values({
        title: 'Test Seminar',
        description: 'A test seminar',
        date: new Date('2024-06-15'),
        time: '10:00',
        location: 'Room A',
        speaker_id: speaker.id,
        capacity: 50,
        cost: '25.50',
        registration_type: 'approval_required'
      })
      .returning()
      .execute();

    // Create registrations with different statuses
    await db.insert(registrationsTable)
      .values([
        { seminar_id: seminar.id, participant_id: participant.id, status: 'pending' },
        { seminar_id: seminar.id, participant_id: participant.id, status: 'approved' },
        { seminar_id: seminar.id, participant_id: participant.id, status: 'rejected' },
        { seminar_id: seminar.id, participant_id: participant.id, status: 'paid' },
        { seminar_id: seminar.id, participant_id: participant.id, status: 'cancelled' }
      ])
      .execute();

    const result = await getRegistrations();

    expect(result).toHaveLength(5);

    const statuses = result.map(r => r.status).sort();
    expect(statuses).toEqual(['approved', 'cancelled', 'paid', 'pending', 'rejected']);

    // Verify all have the same seminar and participant due to joins
    result.forEach(reg => {
      expect(reg.seminar_id).toBe(seminar.id);
      expect(reg.participant_id).toBe(participant.id);
      expect((reg as any).seminar_title).toBe('Test Seminar');
      expect((reg as any).participant_name).toBe('Participant');
      expect((reg as any).seminar_cost).toBe(25.50); // Numeric conversion
    });
  });
});