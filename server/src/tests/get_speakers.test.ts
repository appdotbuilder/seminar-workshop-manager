import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getSpeakers } from '../handlers/get_speakers';

const testSpeaker1: CreateUserInput = {
  name: 'Speaker One',
  email: 'speaker1@example.com',
  role: 'speaker',
  password: 'password123'
};

const testSpeaker2: CreateUserInput = {
  name: 'Speaker Two',
  email: 'speaker2@example.com',
  role: 'speaker',
  password: 'password456'
};

const testParticipant: CreateUserInput = {
  name: 'Participant User',
  email: 'participant@example.com',
  role: 'participant',
  password: 'password789'
};

const testAdmin: CreateUserInput = {
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'admin',
  password: 'adminpass'
};

describe('getSpeakers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no speakers exist', async () => {
    const speakers = await getSpeakers();
    
    expect(speakers).toEqual([]);
    expect(speakers).toHaveLength(0);
  });

  it('should return only users with speaker role', async () => {
    // Create test users with different roles
    await db.insert(usersTable).values([
      testSpeaker1,
      testSpeaker2,
      testParticipant,
      testAdmin
    ]).execute();

    const speakers = await getSpeakers();

    expect(speakers).toHaveLength(2);
    expect(speakers.every(speaker => speaker.role === 'speaker')).toBe(true);
    
    const speakerNames = speakers.map(s => s.name).sort();
    expect(speakerNames).toEqual(['Speaker One', 'Speaker Two']);
  });

  it('should return all speaker fields correctly', async () => {
    // Create a single speaker
    await db.insert(usersTable).values(testSpeaker1).execute();

    const speakers = await getSpeakers();

    expect(speakers).toHaveLength(1);
    const speaker = speakers[0];
    
    expect(speaker.id).toBeDefined();
    expect(speaker.name).toEqual('Speaker One');
    expect(speaker.email).toEqual('speaker1@example.com');
    expect(speaker.role).toEqual('speaker');
    expect(speaker.password).toEqual('password123');
    expect(speaker.created_at).toBeInstanceOf(Date);
  });

  it('should exclude users with non-speaker roles', async () => {
    // Create only non-speaker users
    await db.insert(usersTable).values([
      testParticipant,
      testAdmin
    ]).execute();

    const speakers = await getSpeakers();

    expect(speakers).toHaveLength(0);
  });

  it('should handle multiple speakers correctly', async () => {
    // Create multiple speakers and one non-speaker
    const multipleSpeakers: CreateUserInput[] = [
      testSpeaker1,
      testSpeaker2,
      {
        name: 'Speaker Three',
        email: 'speaker3@example.com',
        role: 'speaker',
        password: 'password999'
      },
      testParticipant // Should not be included
    ];

    await db.insert(usersTable).values(multipleSpeakers).execute();

    const speakers = await getSpeakers();

    expect(speakers).toHaveLength(3);
    expect(speakers.every(speaker => speaker.role === 'speaker')).toBe(true);
    
    const emails = speakers.map(s => s.email).sort();
    expect(emails).toEqual([
      'speaker1@example.com',
      'speaker2@example.com', 
      'speaker3@example.com'
    ]);
  });
});