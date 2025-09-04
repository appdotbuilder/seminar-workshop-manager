import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, seminarsTable, registrationsTable } from '../db/schema';
import { type GetRegistrationsBySeminarInput } from '../schema';
import { getRegistrationsBySeminar } from '../handlers/get_registrations_by_seminar';

describe('getRegistrationsBySeminar', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return registrations for a specific seminar', async () => {
    // Create prerequisite data
    const speaker = await db.insert(usersTable).values({
      name: 'Dr. Speaker',
      email: 'speaker@test.com',
      role: 'speaker',
      password: 'password123'
    }).returning().execute();

    const participant1 = await db.insert(usersTable).values({
      name: 'John Doe',
      email: 'john@test.com',
      role: 'participant',
      password: 'password123'
    }).returning().execute();

    const participant2 = await db.insert(usersTable).values({
      name: 'Jane Smith',
      email: 'jane@test.com',
      role: 'participant',
      password: 'password123'
    }).returning().execute();

    const seminar = await db.insert(seminarsTable).values({
      title: 'Test Seminar',
      description: 'A test seminar',
      date: new Date('2024-06-01'),
      time: '10:00 AM',
      location: 'Conference Room A',
      speaker_id: speaker[0].id,
      capacity: 50,
      cost: '99.99',
      registration_type: 'payment_required'
    }).returning().execute();

    // Create registrations for the seminar
    await db.insert(registrationsTable).values([
      {
        seminar_id: seminar[0].id,
        participant_id: participant1[0].id,
        status: 'approved'
      },
      {
        seminar_id: seminar[0].id,
        participant_id: participant2[0].id,
        status: 'pending'
      }
    ]).execute();

    const input: GetRegistrationsBySeminarInput = {
      seminar_id: seminar[0].id
    };

    const result = await getRegistrationsBySeminar(input);

    expect(result).toHaveLength(2);
    
    // Verify basic fields
    expect(result[0]).toMatchObject({
      seminar_id: seminar[0].id,
      participant_id: expect.any(Number),
      status: expect.stringMatching(/^(approved|pending)$/)
    });
    
    expect(result[1]).toMatchObject({
      seminar_id: seminar[0].id,
      participant_id: expect.any(Number),
      status: expect.stringMatching(/^(approved|pending)$/)
    });

    // Verify timestamps
    result.forEach(registration => {
      expect(registration.id).toBeDefined();
      expect(registration.registration_date).toBeInstanceOf(Date);
      expect(registration.created_at).toBeInstanceOf(Date);
    });
  });

  it('should return empty array for seminar with no registrations', async () => {
    // Create prerequisite data
    const speaker = await db.insert(usersTable).values({
      name: 'Dr. Speaker',
      email: 'speaker@test.com',
      role: 'speaker',
      password: 'password123'
    }).returning().execute();

    const seminar = await db.insert(seminarsTable).values({
      title: 'Empty Seminar',
      description: 'A seminar with no registrations',
      date: new Date('2024-06-01'),
      time: '2:00 PM',
      location: 'Conference Room B',
      speaker_id: speaker[0].id,
      capacity: 30,
      cost: null,
      registration_type: 'free'
    }).returning().execute();

    const input: GetRegistrationsBySeminarInput = {
      seminar_id: seminar[0].id
    };

    const result = await getRegistrationsBySeminar(input);

    expect(result).toHaveLength(0);
  });

  it('should handle registrations with different statuses', async () => {
    // Create prerequisite data
    const speaker = await db.insert(usersTable).values({
      name: 'Dr. Speaker',
      email: 'speaker@test.com',
      role: 'speaker',
      password: 'password123'
    }).returning().execute();

    const participants = await db.insert(usersTable).values([
      {
        name: 'Participant 1',
        email: 'p1@test.com',
        role: 'participant',
        password: 'password123'
      },
      {
        name: 'Participant 2',
        email: 'p2@test.com',
        role: 'participant',
        password: 'password123'
      },
      {
        name: 'Participant 3',
        email: 'p3@test.com',
        role: 'participant',
        password: 'password123'
      }
    ]).returning().execute();

    const seminar = await db.insert(seminarsTable).values({
      title: 'Multi-Status Seminar',
      description: 'A seminar with various registration statuses',
      date: new Date('2024-07-01'),
      time: '9:00 AM',
      location: 'Main Hall',
      speaker_id: speaker[0].id,
      capacity: 100,
      cost: '49.99',
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

    const input: GetRegistrationsBySeminarInput = {
      seminar_id: seminar[0].id
    };

    const result = await getRegistrationsBySeminar(input);

    expect(result).toHaveLength(3);
    
    // Verify all different statuses are present
    const statuses = result.map(r => r.status).sort();
    expect(statuses).toEqual(['approved', 'pending', 'rejected']);

    // Verify each registration has correct seminar_id
    result.forEach(registration => {
      expect(registration.seminar_id).toBe(seminar[0].id);
      expect(registration.participant_id).toBeGreaterThan(0);
    });
  });

  it('should return empty array for non-existent seminar', async () => {
    const input: GetRegistrationsBySeminarInput = {
      seminar_id: 99999 // Non-existent seminar ID
    };

    const result = await getRegistrationsBySeminar(input);

    expect(result).toHaveLength(0);
  });

  it('should handle multiple registrations from same participant correctly', async () => {
    // Create prerequisite data
    const speaker = await db.insert(usersTable).values({
      name: 'Dr. Speaker',
      email: 'speaker@test.com',
      role: 'speaker',
      password: 'password123'
    }).returning().execute();

    const participant = await db.insert(usersTable).values({
      name: 'Multi Registrant',
      email: 'multi@test.com',
      role: 'participant',
      password: 'password123'
    }).returning().execute();

    const seminar = await db.insert(seminarsTable).values({
      title: 'Popular Seminar',
      description: 'A seminar that allows multiple registrations',
      date: new Date('2024-08-01'),
      time: '11:00 AM',
      location: 'Auditorium',
      speaker_id: speaker[0].id,
      capacity: 200,
      cost: '0.00',
      registration_type: 'free'
    }).returning().execute();

    // Create multiple registrations for the same participant (edge case handling)
    await db.insert(registrationsTable).values([
      {
        seminar_id: seminar[0].id,
        participant_id: participant[0].id,
        status: 'cancelled'
      },
      {
        seminar_id: seminar[0].id,
        participant_id: participant[0].id,
        status: 'approved'
      }
    ]).execute();

    const input: GetRegistrationsBySeminarInput = {
      seminar_id: seminar[0].id
    };

    const result = await getRegistrationsBySeminar(input);

    expect(result).toHaveLength(2);
    
    // Both registrations should be for the same participant but have different statuses
    expect(result[0].participant_id).toBe(participant[0].id);
    expect(result[1].participant_id).toBe(participant[0].id);
    
    const statuses = result.map(r => r.status).sort();
    expect(statuses).toEqual(['approved', 'cancelled']);
  });
});