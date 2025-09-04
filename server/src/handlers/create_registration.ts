import { db } from '../db';
import { registrationsTable, seminarsTable, usersTable } from '../db/schema';
import { type CreateRegistrationInput, type Registration } from '../schema';
import { eq, and, count } from 'drizzle-orm';

export const createRegistration = async (input: CreateRegistrationInput): Promise<Registration> => {
  try {
    // Validate that the participant exists and has 'participant' role
    const participant = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.participant_id))
      .limit(1)
      .execute();

    if (participant.length === 0) {
      throw new Error('Participant not found');
    }

    if (participant[0].role !== 'participant') {
      throw new Error('User must have participant role to register for seminars');
    }

    // Validate that the seminar exists
    const seminar = await db.select()
      .from(seminarsTable)
      .where(eq(seminarsTable.id, input.seminar_id))
      .limit(1)
      .execute();

    if (seminar.length === 0) {
      throw new Error('Seminar not found');
    }

    // Check if participant is already registered for this seminar
    const existingRegistration = await db.select()
      .from(registrationsTable)
      .where(and(
        eq(registrationsTable.seminar_id, input.seminar_id),
        eq(registrationsTable.participant_id, input.participant_id)
      ))
      .limit(1)
      .execute();

    if (existingRegistration.length > 0) {
      throw new Error('Participant is already registered for this seminar');
    }

    // Check capacity constraints - count current approved/paid registrations
    const registrationCount = await db.select({ count: count() })
      .from(registrationsTable)
      .where(and(
        eq(registrationsTable.seminar_id, input.seminar_id),
        // Count registrations that are approved or paid (not pending, rejected, or cancelled)
        // Using SQL to handle enum comparison properly
      ))
      .execute();

    // Get current count of non-cancelled registrations
    const currentRegistrations = await db.select()
      .from(registrationsTable)
      .where(and(
        eq(registrationsTable.seminar_id, input.seminar_id)
      ))
      .execute();

    const activeRegistrations = currentRegistrations.filter(
      reg => reg.status === 'approved' || reg.status === 'paid'
    ).length;

    if (activeRegistrations >= seminar[0].capacity) {
      throw new Error('Seminar is at capacity');
    }

    // Determine initial status based on seminar's registration type
    let initialStatus = input.status; // Default to input status
    if (seminar[0].registration_type === 'free') {
      initialStatus = 'approved'; // Free seminars are automatically approved
    } else if (seminar[0].registration_type === 'approval_required' || seminar[0].registration_type === 'payment_required') {
      initialStatus = 'pending'; // Requires approval or payment
    }

    // Create the registration
    const result = await db.insert(registrationsTable)
      .values({
        seminar_id: input.seminar_id,
        participant_id: input.participant_id,
        status: initialStatus
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Registration creation failed:', error);
    throw error;
  }
};