import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import {
  createUserInputSchema,
  updateUserInputSchema,
  getUserInputSchema,
  createSeminarInputSchema,
  updateSeminarInputSchema,
  getSeminarInputSchema,
  createRegistrationInputSchema,
  updateRegistrationStatusInputSchema,
  getRegistrationsByUserInputSchema,
  getRegistrationsBySeminarInputSchema,
  updateAttendanceInputSchema,
  getAttendanceByRegistrationInputSchema,
  generateCertificateInputSchema,
  getCertificateByRegistrationInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { getUser } from './handlers/get_user';
import { updateUser } from './handlers/update_user';
import { deleteUser } from './handlers/delete_user';
import { createSeminar } from './handlers/create_seminar';
import { getSeminars } from './handlers/get_seminars';
import { getSeminar } from './handlers/get_seminar';
import { updateSeminar } from './handlers/update_seminar';
import { deleteSeminar } from './handlers/delete_seminar';
import { createRegistration } from './handlers/create_registration';
import { getRegistrations } from './handlers/get_registrations';
import { getRegistrationsByUser } from './handlers/get_registrations_by_user';
import { getRegistrationsBySeminar } from './handlers/get_registrations_by_seminar';
import { updateRegistrationStatus } from './handlers/update_registration_status';
import { cancelRegistration } from './handlers/cancel_registration';
import { updateAttendance } from './handlers/update_attendance';
import { getAttendanceByRegistration } from './handlers/get_attendance_by_registration';
import { getAttendanceBySeminar } from './handlers/get_attendance_by_seminar';
import { generateCertificate } from './handlers/generate_certificate';
import { getCertificateByRegistration } from './handlers/get_certificate_by_registration';
import { getCertificates } from './handlers/get_certificates';
import { getSpeakers } from './handlers/get_speakers';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  getUsers: publicProcedure
    .query(() => getUsers()),
  
  getUser: publicProcedure
    .input(getUserInputSchema)
    .query(({ input }) => getUser(input)),
  
  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),
  
  deleteUser: publicProcedure
    .input(getUserInputSchema)
    .mutation(({ input }) => deleteUser(input)),

  // Get speakers specifically (users with speaker role)
  getSpeakers: publicProcedure
    .query(() => getSpeakers()),

  // Seminar/Workshop management routes
  createSeminar: publicProcedure
    .input(createSeminarInputSchema)
    .mutation(({ input }) => createSeminar(input)),
  
  getSeminars: publicProcedure
    .query(() => getSeminars()),
  
  getSeminar: publicProcedure
    .input(getSeminarInputSchema)
    .query(({ input }) => getSeminar(input)),
  
  updateSeminar: publicProcedure
    .input(updateSeminarInputSchema)
    .mutation(({ input }) => updateSeminar(input)),
  
  deleteSeminar: publicProcedure
    .input(getSeminarInputSchema)
    .mutation(({ input }) => deleteSeminar(input)),

  // Registration management routes
  createRegistration: publicProcedure
    .input(createRegistrationInputSchema)
    .mutation(({ input }) => createRegistration(input)),
  
  getRegistrations: publicProcedure
    .query(() => getRegistrations()),
  
  getRegistrationsByUser: publicProcedure
    .input(getRegistrationsByUserInputSchema)
    .query(({ input }) => getRegistrationsByUser(input)),
  
  getRegistrationsBySeminar: publicProcedure
    .input(getRegistrationsBySeminarInputSchema)
    .query(({ input }) => getRegistrationsBySeminar(input)),
  
  updateRegistrationStatus: publicProcedure
    .input(updateRegistrationStatusInputSchema)
    .mutation(({ input }) => updateRegistrationStatus(input)),
  
  cancelRegistration: publicProcedure
    .input(updateRegistrationStatusInputSchema)
    .mutation(({ input }) => cancelRegistration(input)),

  // Attendance management routes
  updateAttendance: publicProcedure
    .input(updateAttendanceInputSchema)
    .mutation(({ input }) => updateAttendance(input)),
  
  getAttendanceByRegistration: publicProcedure
    .input(getAttendanceByRegistrationInputSchema)
    .query(({ input }) => getAttendanceByRegistration(input)),
  
  getAttendanceBySeminar: publicProcedure
    .input(getRegistrationsBySeminarInputSchema)
    .query(({ input }) => getAttendanceBySeminar(input)),

  // Certificate management routes
  generateCertificate: publicProcedure
    .input(generateCertificateInputSchema)
    .mutation(({ input }) => generateCertificate(input)),
  
  getCertificateByRegistration: publicProcedure
    .input(getCertificateByRegistrationInputSchema)
    .query(({ input }) => getCertificateByRegistration(input)),
  
  getCertificates: publicProcedure
    .query(() => getCertificates()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();