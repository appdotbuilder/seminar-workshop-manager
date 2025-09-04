import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'participant', 'speaker']);
export const registrationTypeEnum = pgEnum('registration_type', ['free', 'approval_required', 'payment_required']);
export const registrationStatusEnum = pgEnum('registration_status', ['pending', 'approved', 'rejected', 'paid', 'cancelled']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: userRoleEnum('role').notNull(),
  password: text('password').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Seminars table
export const seminarsTable = pgTable('seminars', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  date: timestamp('date').notNull(),
  time: text('time').notNull(),
  location: text('location').notNull(),
  speaker_id: integer('speaker_id').notNull().references(() => usersTable.id),
  capacity: integer('capacity').notNull(),
  cost: numeric('cost', { precision: 10, scale: 2 }), // Nullable by default for free events
  registration_type: registrationTypeEnum('registration_type').notNull().default('free'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Registrations table
export const registrationsTable = pgTable('registrations', {
  id: serial('id').primaryKey(),
  seminar_id: integer('seminar_id').notNull().references(() => seminarsTable.id),
  participant_id: integer('participant_id').notNull().references(() => usersTable.id),
  registration_date: timestamp('registration_date').defaultNow().notNull(),
  status: registrationStatusEnum('status').notNull().default('pending'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Attendance table
export const attendanceTable = pgTable('attendance', {
  id: serial('id').primaryKey(),
  registration_id: integer('registration_id').notNull().references(() => registrationsTable.id),
  attended: boolean('attended').notNull(),
  attendance_date: timestamp('attendance_date').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Certificates table
export const certificatesTable = pgTable('certificates', {
  id: serial('id').primaryKey(),
  registration_id: integer('registration_id').notNull().references(() => registrationsTable.id),
  issue_date: timestamp('issue_date').defaultNow().notNull(),
  certificate_url: text('certificate_url').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  seminars: many(seminarsTable), // Seminars where user is speaker
  registrations: many(registrationsTable), // Registrations where user is participant
}));

export const seminarsRelations = relations(seminarsTable, ({ one, many }) => ({
  speaker: one(usersTable, {
    fields: [seminarsTable.speaker_id],
    references: [usersTable.id],
  }),
  registrations: many(registrationsTable),
}));

export const registrationsRelations = relations(registrationsTable, ({ one }) => ({
  seminar: one(seminarsTable, {
    fields: [registrationsTable.seminar_id],
    references: [seminarsTable.id],
  }),
  participant: one(usersTable, {
    fields: [registrationsTable.participant_id],
    references: [usersTable.id],
  }),
  attendance: one(attendanceTable),
  certificate: one(certificatesTable),
}));

export const attendanceRelations = relations(attendanceTable, ({ one }) => ({
  registration: one(registrationsTable, {
    fields: [attendanceTable.registration_id],
    references: [registrationsTable.id],
  }),
}));

export const certificatesRelations = relations(certificatesTable, ({ one }) => ({
  registration: one(registrationsTable, {
    fields: [certificatesTable.registration_id],
    references: [registrationsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Seminar = typeof seminarsTable.$inferSelect;
export type NewSeminar = typeof seminarsTable.$inferInsert;

export type Registration = typeof registrationsTable.$inferSelect;
export type NewRegistration = typeof registrationsTable.$inferInsert;

export type Attendance = typeof attendanceTable.$inferSelect;
export type NewAttendance = typeof attendanceTable.$inferInsert;

export type Certificate = typeof certificatesTable.$inferSelect;
export type NewCertificate = typeof certificatesTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  seminars: seminarsTable,
  registrations: registrationsTable,
  attendance: attendanceTable,
  certificates: certificatesTable,
};

export const tableRelations = {
  usersRelations,
  seminarsRelations,
  registrationsRelations,
  attendanceRelations,
  certificatesRelations,
};