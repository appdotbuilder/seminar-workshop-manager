import { db } from '../db';
import { certificatesTable, registrationsTable, seminarsTable, usersTable } from '../db/schema';
import { type Certificate } from '../schema';
import { eq } from 'drizzle-orm';

export const getCertificates = async (): Promise<Certificate[]> => {
  try {
    // Fetch all certificates with joined registration, seminar, and participant data
    const results = await db.select()
      .from(certificatesTable)
      .innerJoin(registrationsTable, eq(certificatesTable.registration_id, registrationsTable.id))
      .innerJoin(seminarsTable, eq(registrationsTable.seminar_id, seminarsTable.id))
      .innerJoin(usersTable, eq(registrationsTable.participant_id, usersTable.id))
      .execute();

    // Transform the joined results back to Certificate objects
    return results.map(result => ({
      id: result.certificates.id,
      registration_id: result.certificates.registration_id,
      issue_date: result.certificates.issue_date,
      certificate_url: result.certificates.certificate_url,
      created_at: result.certificates.created_at
    }));
  } catch (error) {
    console.error('Failed to fetch certificates:', error);
    throw error;
  }
};