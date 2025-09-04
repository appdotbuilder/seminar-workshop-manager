import { db } from '../db';
import { registrationsTable, attendanceTable, certificatesTable, seminarsTable, usersTable } from '../db/schema';
import { type GenerateCertificateInput, type Certificate } from '../schema';
import { eq, and } from 'drizzle-orm';

export const generateCertificate = async (input: GenerateCertificateInput): Promise<Certificate> => {
  try {
    // Validate that registration exists and get registration details with seminar and participant info
    const registrationResults = await db.select({
      registration: registrationsTable,
      seminar: seminarsTable,
      participant: usersTable
    })
      .from(registrationsTable)
      .innerJoin(seminarsTable, eq(registrationsTable.seminar_id, seminarsTable.id))
      .innerJoin(usersTable, eq(registrationsTable.participant_id, usersTable.id))
      .where(eq(registrationsTable.id, input.registration_id))
      .execute();

    if (registrationResults.length === 0) {
      throw new Error('Registration not found');
    }

    const { registration, seminar, participant } = registrationResults[0];

    // Check if registration is approved/paid (valid status)
    if (registration.status === 'pending' || registration.status === 'rejected' || registration.status === 'cancelled') {
      throw new Error('Registration is not in a valid status for certificate generation');
    }

    // Check if participant actually attended
    const attendanceResults = await db.select()
      .from(attendanceTable)
      .where(and(
        eq(attendanceTable.registration_id, input.registration_id),
        eq(attendanceTable.attended, true)
      ))
      .execute();

    if (attendanceResults.length === 0) {
      throw new Error('Participant did not attend the seminar');
    }

    // Check if certificate already exists
    const existingCertificates = await db.select()
      .from(certificatesTable)
      .where(eq(certificatesTable.registration_id, input.registration_id))
      .execute();

    if (existingCertificates.length > 0) {
      // Return existing certificate instead of creating a duplicate
      const existingCert = existingCertificates[0];
      return {
        ...existingCert,
        issue_date: existingCert.issue_date
      };
    }

    // Generate certificate URL/path
    const timestamp = Date.now();
    const certificateUrl = `/certificates/cert_${input.registration_id}_${timestamp}.txt`;

    // Create certificate record
    const result = await db.insert(certificatesTable)
      .values({
        registration_id: input.registration_id,
        certificate_url: certificateUrl
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Certificate generation failed:', error);
    throw error;
  }
};