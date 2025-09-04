import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, seminarsTable, registrationsTable, certificatesTable } from '../db/schema';
import { getCertificates } from '../handlers/get_certificates';

describe('getCertificates', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no certificates exist', async () => {
    const result = await getCertificates();
    expect(result).toEqual([]);
  });

  it('should fetch all certificates with proper structure', async () => {
    // Create prerequisite data
    const speaker = await db.insert(usersTable)
      .values({
        name: 'Speaker One',
        email: 'speaker@example.com',
        role: 'speaker',
        password: 'password123'
      })
      .returning()
      .execute();

    const participant = await db.insert(usersTable)
      .values({
        name: 'John Participant',
        email: 'john@example.com',
        role: 'participant',
        password: 'password123'
      })
      .returning()
      .execute();

    const seminar = await db.insert(seminarsTable)
      .values({
        title: 'Test Seminar',
        description: 'A test seminar',
        date: new Date('2024-06-15'),
        time: '10:00',
        location: 'Conference Room A',
        speaker_id: speaker[0].id,
        capacity: 50,
        cost: '25.00',
        registration_type: 'payment_required'
      })
      .returning()
      .execute();

    const registration = await db.insert(registrationsTable)
      .values({
        seminar_id: seminar[0].id,
        participant_id: participant[0].id,
        status: 'paid'
      })
      .returning()
      .execute();

    const certificate = await db.insert(certificatesTable)
      .values({
        registration_id: registration[0].id,
        issue_date: new Date('2024-06-16'),
        certificate_url: 'https://example.com/cert/123'
      })
      .returning()
      .execute();

    const result = await getCertificates();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: certificate[0].id,
      registration_id: registration[0].id,
      issue_date: certificate[0].issue_date,
      certificate_url: 'https://example.com/cert/123',
      created_at: expect.any(Date)
    });
  });

  it('should fetch multiple certificates correctly', async () => {
    // Create two speakers
    const speaker1 = await db.insert(usersTable)
      .values({
        name: 'Speaker One',
        email: 'speaker1@example.com',
        role: 'speaker',
        password: 'password123'
      })
      .returning()
      .execute();

    const speaker2 = await db.insert(usersTable)
      .values({
        name: 'Speaker Two',
        email: 'speaker2@example.com',
        role: 'speaker',
        password: 'password123'
      })
      .returning()
      .execute();

    // Create two participants
    const participant1 = await db.insert(usersTable)
      .values({
        name: 'John Participant',
        email: 'john@example.com',
        role: 'participant',
        password: 'password123'
      })
      .returning()
      .execute();

    const participant2 = await db.insert(usersTable)
      .values({
        name: 'Jane Participant',
        email: 'jane@example.com',
        role: 'participant',
        password: 'password123'
      })
      .returning()
      .execute();

    // Create two seminars
    const seminar1 = await db.insert(seminarsTable)
      .values({
        title: 'Web Development',
        description: 'Learn web development',
        date: new Date('2024-06-15'),
        time: '10:00',
        location: 'Room A',
        speaker_id: speaker1[0].id,
        capacity: 30,
        cost: '0.00',
        registration_type: 'free'
      })
      .returning()
      .execute();

    const seminar2 = await db.insert(seminarsTable)
      .values({
        title: 'Data Science',
        description: 'Introduction to data science',
        date: new Date('2024-06-20'),
        time: '14:00',
        location: 'Room B',
        speaker_id: speaker2[0].id,
        capacity: 25,
        cost: '50.00',
        registration_type: 'payment_required'
      })
      .returning()
      .execute();

    // Create registrations
    const registration1 = await db.insert(registrationsTable)
      .values({
        seminar_id: seminar1[0].id,
        participant_id: participant1[0].id,
        status: 'approved'
      })
      .returning()
      .execute();

    const registration2 = await db.insert(registrationsTable)
      .values({
        seminar_id: seminar2[0].id,
        participant_id: participant2[0].id,
        status: 'paid'
      })
      .returning()
      .execute();

    // Create certificates
    await db.insert(certificatesTable)
      .values({
        registration_id: registration1[0].id,
        issue_date: new Date('2024-06-16'),
        certificate_url: 'https://example.com/cert/web-dev-123'
      })
      .execute();

    await db.insert(certificatesTable)
      .values({
        registration_id: registration2[0].id,
        issue_date: new Date('2024-06-21'),
        certificate_url: 'https://example.com/cert/data-science-456'
      })
      .execute();

    const result = await getCertificates();

    expect(result).toHaveLength(2);
    
    // Verify all certificates have proper structure
    result.forEach(cert => {
      expect(cert.id).toBeDefined();
      expect(cert.registration_id).toBeDefined();
      expect(cert.issue_date).toBeInstanceOf(Date);
      expect(cert.certificate_url).toMatch(/^https:\/\/example\.com\/cert\//);
      expect(cert.created_at).toBeInstanceOf(Date);
    });

    // Verify certificate URLs are different
    const urls = result.map(cert => cert.certificate_url);
    expect(urls).toContain('https://example.com/cert/web-dev-123');
    expect(urls).toContain('https://example.com/cert/data-science-456');
  });

  it('should handle certificates with different issue dates', async () => {
    // Create prerequisite data
    const speaker = await db.insert(usersTable)
      .values({
        name: 'Test Speaker',
        email: 'speaker@example.com',
        role: 'speaker',
        password: 'password123'
      })
      .returning()
      .execute();

    const participant = await db.insert(usersTable)
      .values({
        name: 'Test Participant',
        email: 'participant@example.com',
        role: 'participant',
        password: 'password123'
      })
      .returning()
      .execute();

    const seminar = await db.insert(seminarsTable)
      .values({
        title: 'Advanced Programming',
        description: 'Advanced programming concepts',
        date: new Date('2024-07-01'),
        time: '09:00',
        location: 'Lab 1',
        speaker_id: speaker[0].id,
        capacity: 20,
        cost: null,
        registration_type: 'approval_required'
      })
      .returning()
      .execute();

    const registration = await db.insert(registrationsTable)
      .values({
        seminar_id: seminar[0].id,
        participant_id: participant[0].id,
        status: 'approved'
      })
      .returning()
      .execute();

    // Create certificate with specific issue date
    const specificDate = new Date('2024-07-02T08:30:00Z');
    await db.insert(certificatesTable)
      .values({
        registration_id: registration[0].id,
        issue_date: specificDate,
        certificate_url: 'https://certificates.example.com/advanced-prog-789'
      })
      .execute();

    const result = await getCertificates();

    expect(result).toHaveLength(1);
    expect(result[0].issue_date).toEqual(specificDate);
    expect(result[0].certificate_url).toBe('https://certificates.example.com/advanced-prog-789');
  });
});