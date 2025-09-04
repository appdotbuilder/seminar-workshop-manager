import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, seminarsTable, registrationsTable, certificatesTable } from '../db/schema';
import { type GetCertificateByRegistrationInput } from '../schema';
import { getCertificateByRegistration } from '../handlers/get_certificate_by_registration';

describe('getCertificateByRegistration', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return certificate when it exists', async () => {
    // Create test user (speaker)
    const speakerResult = await db.insert(usersTable)
      .values({
        name: 'Test Speaker',
        email: 'speaker@test.com',
        role: 'speaker',
        password: 'password123'
      })
      .returning()
      .execute();

    // Create test user (participant)
    const participantResult = await db.insert(usersTable)
      .values({
        name: 'Test Participant',
        email: 'participant@test.com',
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
        date: new Date(),
        time: '10:00 AM',
        location: 'Test Location',
        speaker_id: speakerResult[0].id,
        capacity: 50,
        cost: null,
        registration_type: 'free'
      })
      .returning()
      .execute();

    // Create test registration
    const registrationResult = await db.insert(registrationsTable)
      .values({
        seminar_id: seminarResult[0].id,
        participant_id: participantResult[0].id,
        status: 'approved'
      })
      .returning()
      .execute();

    // Create test certificate
    const certificateResult = await db.insert(certificatesTable)
      .values({
        registration_id: registrationResult[0].id,
        certificate_url: 'https://example.com/certificate.pdf'
      })
      .returning()
      .execute();

    const testInput: GetCertificateByRegistrationInput = {
      registration_id: registrationResult[0].id
    };

    const result = await getCertificateByRegistration(testInput);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(certificateResult[0].id);
    expect(result!.registration_id).toEqual(registrationResult[0].id);
    expect(result!.certificate_url).toEqual('https://example.com/certificate.pdf');
    expect(result!.issue_date).toBeInstanceOf(Date);
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return null when certificate does not exist', async () => {
    const testInput: GetCertificateByRegistrationInput = {
      registration_id: 999 // Non-existent registration ID
    };

    const result = await getCertificateByRegistration(testInput);

    expect(result).toBeNull();
  });

  it('should return correct certificate when multiple certificates exist', async () => {
    // Create test user (speaker)
    const speakerResult = await db.insert(usersTable)
      .values({
        name: 'Test Speaker',
        email: 'speaker@test.com',
        role: 'speaker',
        password: 'password123'
      })
      .returning()
      .execute();

    // Create test users (participants)
    const participant1Result = await db.insert(usersTable)
      .values({
        name: 'Test Participant 1',
        email: 'participant1@test.com',
        role: 'participant',
        password: 'password123'
      })
      .returning()
      .execute();

    const participant2Result = await db.insert(usersTable)
      .values({
        name: 'Test Participant 2',
        email: 'participant2@test.com',
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
        date: new Date(),
        time: '10:00 AM',
        location: 'Test Location',
        speaker_id: speakerResult[0].id,
        capacity: 50,
        cost: null,
        registration_type: 'free'
      })
      .returning()
      .execute();

    // Create test registrations
    const registration1Result = await db.insert(registrationsTable)
      .values({
        seminar_id: seminarResult[0].id,
        participant_id: participant1Result[0].id,
        status: 'approved'
      })
      .returning()
      .execute();

    const registration2Result = await db.insert(registrationsTable)
      .values({
        seminar_id: seminarResult[0].id,
        participant_id: participant2Result[0].id,
        status: 'approved'
      })
      .returning()
      .execute();

    // Create test certificates for both registrations
    await db.insert(certificatesTable)
      .values({
        registration_id: registration1Result[0].id,
        certificate_url: 'https://example.com/certificate1.pdf'
      })
      .execute();

    const certificate2Result = await db.insert(certificatesTable)
      .values({
        registration_id: registration2Result[0].id,
        certificate_url: 'https://example.com/certificate2.pdf'
      })
      .returning()
      .execute();

    const testInput: GetCertificateByRegistrationInput = {
      registration_id: registration2Result[0].id
    };

    const result = await getCertificateByRegistration(testInput);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(certificate2Result[0].id);
    expect(result!.registration_id).toEqual(registration2Result[0].id);
    expect(result!.certificate_url).toEqual('https://example.com/certificate2.pdf');
  });

  it('should handle database query correctly', async () => {
    // Create test user (speaker)
    const speakerResult = await db.insert(usersTable)
      .values({
        name: 'Test Speaker',
        email: 'speaker@test.com',
        role: 'speaker',
        password: 'password123'
      })
      .returning()
      .execute();

    // Create test user (participant)
    const participantResult = await db.insert(usersTable)
      .values({
        name: 'Test Participant',
        email: 'participant@test.com',
        role: 'participant',
        password: 'password123'
      })
      .returning()
      .execute();

    // Create test seminar
    const seminarResult = await db.insert(seminarsTable)
      .values({
        title: 'Database Query Test Seminar',
        description: 'Testing database queries',
        date: new Date(),
        time: '2:00 PM',
        location: 'Database Lab',
        speaker_id: speakerResult[0].id,
        capacity: 25,
        cost: null,
        registration_type: 'free'
      })
      .returning()
      .execute();

    // Create test registration
    const registrationResult = await db.insert(registrationsTable)
      .values({
        seminar_id: seminarResult[0].id,
        participant_id: participantResult[0].id,
        status: 'approved'
      })
      .returning()
      .execute();

    // Create test certificate with specific issue date
    const issueDate = new Date('2024-01-15T10:30:00Z');
    await db.insert(certificatesTable)
      .values({
        registration_id: registrationResult[0].id,
        certificate_url: 'https://example.com/db-test-certificate.pdf',
        issue_date: issueDate
      })
      .execute();

    const testInput: GetCertificateByRegistrationInput = {
      registration_id: registrationResult[0].id
    };

    const result = await getCertificateByRegistration(testInput);

    expect(result).toBeDefined();
    expect(result!.registration_id).toEqual(registrationResult[0].id);
    expect(result!.certificate_url).toEqual('https://example.com/db-test-certificate.pdf');
    expect(result!.issue_date).toBeInstanceOf(Date);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(typeof result!.id).toBe('number');
  });
});