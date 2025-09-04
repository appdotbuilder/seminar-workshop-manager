import { db } from '../db';
import { certificatesTable } from '../db/schema';
import { type GetCertificateByRegistrationInput, type Certificate } from '../schema';
import { eq } from 'drizzle-orm';

export const getCertificateByRegistration = async (input: GetCertificateByRegistrationInput): Promise<Certificate | null> => {
  try {
    const result = await db.select()
      .from(certificatesTable)
      .where(eq(certificatesTable.registration_id, input.registration_id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    const certificate = result[0];
    return {
      ...certificate
    };
  } catch (error) {
    console.error('Certificate retrieval failed:', error);
    throw error;
  }
};