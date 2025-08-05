
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  updateUserInputSchema,
  loginInputSchema,
  createCategoryInputSchema,
  updateCategoryInputSchema,
  createArchiveInputSchema,
  updateArchiveInputSchema,
  searchArchivesInputSchema,
  createAccessLogInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { updateUser } from './handlers/update_user';
import { deleteUser } from './handlers/delete_user';
import { login } from './handlers/login';
import { createCategory } from './handlers/create_category';
import { getCategories } from './handlers/get_categories';
import { updateCategory } from './handlers/update_category';
import { deleteCategory } from './handlers/delete_category';
import { createArchive } from './handlers/create_archive';
import { getArchives } from './handlers/get_archives';
import { searchArchives } from './handlers/search_archives';
import { getArchiveById } from './handlers/get_archive_by_id';
import { updateArchive } from './handlers/update_archive';
import { deleteArchive } from './handlers/delete_archive';
import { createAccessLog } from './handlers/create_access_log';
import { getAccessLogs } from './handlers/get_access_logs';
import { getUserAccessLogs } from './handlers/get_user_access_logs';
import { getArchiveAccessLogs } from './handlers/get_archive_access_logs';
import { getDashboardStats } from './handlers/get_dashboard_stats';

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

  // Authentication
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  getUsers: publicProcedure
    .query(() => getUsers()),
  
  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),
  
  deleteUser: publicProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(({ input }) => deleteUser(input.userId)),

  // Category management
  createCategory: publicProcedure
    .input(createCategoryInputSchema)
    .mutation(({ input }) => createCategory(input)),
  
  getCategories: publicProcedure
    .query(() => getCategories()),
  
  updateCategory: publicProcedure
    .input(updateCategoryInputSchema)
    .mutation(({ input }) => updateCategory(input)),
  
  deleteCategory: publicProcedure
    .input(z.object({ categoryId: z.number() }))
    .mutation(({ input }) => deleteCategory(input.categoryId)),

  // Archive management
  createArchive: publicProcedure
    .input(createArchiveInputSchema)
    .mutation(({ input }) => createArchive(input)),
  
  getArchives: publicProcedure
    .query(() => getArchives()),
  
  searchArchives: publicProcedure
    .input(searchArchivesInputSchema)
    .query(({ input }) => searchArchives(input)),
  
  getArchiveById: publicProcedure
    .input(z.object({ archiveId: z.number() }))
    .query(({ input }) => getArchiveById(input.archiveId)),
  
  updateArchive: publicProcedure
    .input(updateArchiveInputSchema)
    .mutation(({ input }) => updateArchive(input)),
  
  deleteArchive: publicProcedure
    .input(z.object({ archiveId: z.number() }))
    .mutation(({ input }) => deleteArchive(input.archiveId)),

  // Access logging
  createAccessLog: publicProcedure
    .input(createAccessLogInputSchema)
    .mutation(({ input }) => createAccessLog(input)),
  
  getAccessLogs: publicProcedure
    .query(() => getAccessLogs()),
  
  getUserAccessLogs: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserAccessLogs(input.userId)),
  
  getArchiveAccessLogs: publicProcedure
    .input(z.object({ archiveId: z.number() }))
    .query(({ input }) => getArchiveAccessLogs(input.archiveId)),

  // Dashboard
  getDashboardStats: publicProcedure
    .query(() => getDashboardStats())
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
