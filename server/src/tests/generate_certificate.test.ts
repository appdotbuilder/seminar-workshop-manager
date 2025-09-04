import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, seminarsTable, registrationsTable, attendanceTable, certificatesTable } from '../db/schema';
import { type GenerateCertificateInput } from '../schema';
import { generateCertificate } from '../handlers/generate_certificate';
import { eq } from 'drizzle-orm';

describe('generateCertificate', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let speakerId: number;
  let participantId: number;
  let seminarId: number;
  let registrationId: number;

  const setupTestData = async () => {
    // Create speaker user
    const speakers = await db.insert(usersTable)
      .values({
        name: 'Test Speaker',
        email: 'speaker@test.com',
        role: 'speaker',
        password: 'password123'
      })
      .returning()
      .execute();
    speakerId = speakers[0].id;

    // Create participant user
    const participants = await db.insert(usersTable)
      .values({
        name: 'Test Participant',
        email: 'participant@test.com',
        role: 'participant',
        password: 'password123'
      })
      .returning()
      .execute();
    participantId = participants[0].id;

    // Create seminar
    const seminars = await db.insert(seminarsTable)
      .values({
        title: 'Test Seminar',
        description: 'A test seminar',
        date: new Date('2024-01-15'),
        time: '10:00 AM',
        location: 'Test Location',
        speaker_id: speakerId,
        capacity: 50,
        cost: '0',
        registration_type: 'free'
      })
      .returning()
      .execute();
    seminarId = seminars[0].id;

    // Create registration
    const registrations = await db.insert(registrationsTable)
      .values({
        seminar_id: seminarId,
        participant_id: participantId,
        status: 'approved'
      })
      .returning()
      .execute();
    registrationId = registrations[0].id;
  };

  it('should generate certificate for valid attended registration', async () => {
    await setupTestData();

    // Mark attendance as attended
    await db.insert(attendanceTable)
      .values({
        registration_id: registrationId,
        attended: true
      })
      .execute();

    const input: GenerateCertificateInput = {
      registration_id: registrationId
    };

    const result = await generateCertificate(input);

    // Validate certificate fields
    expect(result.id).toBeDefined();
    expect(result.registration_id).toEqual(registrationId);
    expect(result.issue_date).toBeInstanceOf(Date);
    expect(result.certificate_url).toMatch(/^\/certificates\/cert_\d+_\d+\.txt$/);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save certificate to database', async () => {
    await setupTestData();

    // Mark attendance as attended
    await db.insert(attendanceTable)
      .values({
        registration_id: registrationId,
        attended: true
      })
      .execute();

    const input: GenerateCertificateInput = {
      registration_id: registrationId
    };

    const result = await generateCertificate(input);

    // Verify certificate was saved to database
    const certificates = await db.select()
      .from(certificatesTable)
      .where(eq(certificatesTable.id, result.id))
      .execute();

    expect(certificates).toHaveLength(1);
    expect(certificates[0].registration_id).toEqual(registrationId);
    expect(certificates[0].certificate_url).toEqual(result.certificate_url);
    expect(certificates[0].issue_date).toBeInstanceOf(Date);
  });

  it('should return existing certificate if one already exists', async () => {
    await setupTestData();

    // Mark attendance as attended
    await db.insert(attendanceTable)
      .values({
        registration_id: registrationId,
        attended: true
      })
      .execute();

    const input: GenerateCertificateInput = {
      registration_id: registrationId
    };

    // Generate certificate first time
    const firstResult = await generateCertificate(input);

    // Generate certificate second time
    const secondResult = await generateCertificate(input);

    // Should return the same certificate
    expect(secondResult.id).toEqual(firstResult.id);
    expect(secondResult.registration_id).toEqual(firstResult.registration_id);
    expect(secondResult.certificate_url).toEqual(firstResult.certificate_url);

    // Verify only one certificate exists in database
    const certificates = await db.select()
      .from(certificatesTable)
      .where(eq(certificatesTable.registration_id, registrationId))
      .execute();

    expect(certificates).toHaveLength(1);
  });

  it('should throw error for non-existent registration', async () => {
    const input: GenerateCertificateInput = {
      registration_id: 99999 // Non-existent ID
    };

    await expect(generateCertificate(input)).rejects.toThrow(/registration not found/i);
  });

  it('should throw error for pending registration', async () => {
    await setupTestData();

    // Update registration to pending status
    await db.update(registrationsTable)
      .set({ status: 'pending' })
      .where(eq(registrationsTable.id, registrationId))
      .execute();

    // Mark attendance as attended
    await db.insert(attendanceTable)
      .values({
        registration_id: registrationId,
        attended: true
      })
      .execute();

    const input: GenerateCertificateInput = {
      registration_id: registrationId
    };

    await expect(generateCertificate(input)).rejects.toThrow(/not in a valid status/i);
  });

  it('should throw error for rejected registration', async () => {
    await setupTestData();

    // Update registration to rejected status
    await db.update(registrationsTable)
      .set({ status: 'rejected' })
      .where(eq(registrationsTable.id, registrationId))
      .execute();

    // Mark attendance as attended
    await db.insert(attendanceTable)
      .values({
        registration_id: registrationId,
        attended: true
      })
      .execute();

    const input: GenerateCertificateInput = {
      registration_id: registrationId
    };

    await expect(generateCertificate(input)).rejects.toThrow(/not in a valid status/i);
  });

  it('should throw error for cancelled registration', async () => {
    await setupTestData();

    // Update registration to cancelled status
    await db.update(registrationsTable)
      .set({ status: 'cancelled' })
      .where(eq(registrationsTable.id, registrationId))
      .execute();

    // Mark attendance as attended
    await db.insert(attendanceTable)
      .values({
        registration_id: registrationId,
        attended: true
      })
      .execute();

    const input: GenerateCertificateInput = {
      registration_id: registrationId
    };

    await expect(generateCertificate(input)).rejects.toThrow(/not in a valid status/i);
  });

  it('should throw error when participant did not attend', async () => {
    await setupTestData();

    // Mark attendance as NOT attended
    await db.insert(attendanceTable)
      .values({
        registration_id: registrationId,
        attended: false
      })
      .execute();

    const input: GenerateCertificateInput = {
      registration_id: registrationId
    };

    await expect(generateCertificate(input)).rejects.toThrow(/did not attend/i);
  });

  it('should throw error when no attendance record exists', async () => {
    await setupTestData();

    // No attendance record created

    const input: GenerateCertificateInput = {
      registration_id: registrationId
    };

    await expect(generateCertificate(input)).rejects.toThrow(/did not attend/i);
  });

  it('should work for paid registration status', async () => {
    await setupTestData();

    // Update registration to paid status
    await db.update(registrationsTable)
      .set({ status: 'paid' })
      .where(eq(registrationsTable.id, registrationId))
      .execute();

    // Mark attendance as attended
    await db.insert(attendanceTable)
      .values({
        registration_id: registrationId,
        attended: true
      })
      .execute();

    const input: GenerateCertificateInput = {
      registration_id: registrationId
    };

    const result = await generateCertificate(input);

    expect(result.registration_id).toEqual(registrationId);
    expect(result.certificate_url).toMatch(/^\/certificates\/cert_\d+_\d+\.txt$/);
  });

  it('should generate unique certificate URLs', async () => {
    await setupTestData();

    // Create second registration
    const secondRegistrations = await db.insert(registrationsTable)
      .values({
        seminar_id: seminarId,
        participant_id: participantId,
        status: 'approved'
      })
      .returning()
      .execute();
    const secondRegistrationId = secondRegistrations[0].id;

    // Mark both as attended
    await db.insert(attendanceTable)
      .values([
        {
          registration_id: registrationId,
          attended: true
        },
        {
          registration_id: secondRegistrationId,
          attended: true
        }
      ])
      .execute();

    // Generate certificates with slight delay to ensure different timestamps
    const firstResult = await generateCertificate({ registration_id: registrationId });
    
    // Small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const secondResult = await generateCertificate({ registration_id: secondRegistrationId });

    // URLs should be different
    expect(firstResult.certificate_url).not.toEqual(secondResult.certificate_url);
    
    // Both should follow the expected pattern
    expect(firstResult.certificate_url).toMatch(/^\/certificates\/cert_\d+_\d+\.txt$/);
    expect(secondResult.certificate_url).toMatch(/^\/certificates\/cert_\d+_\d+\.txt$/);
  });
});