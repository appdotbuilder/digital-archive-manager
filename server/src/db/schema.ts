
import { serial, text, pgTable, timestamp, integer, boolean, pgEnum, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'user']);
export const fileTypeEnum = pgEnum('file_type', ['pdf', 'docx', 'jpg', 'jpeg', 'png', 'gif', 'other']);
export const accessActionEnum = pgEnum('access_action', ['view', 'download', 'upload', 'delete']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password_hash: text('password_hash').notNull(),
  first_name: varchar('first_name', { length: 100 }).notNull(),
  last_name: varchar('last_name', { length: 100 }).notNull(),
  role: userRoleEnum('role').notNull().default('user'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Categories table
export const categoriesTable = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Archives table
export const archivesTable = pgTable('archives', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  file_name: varchar('file_name', { length: 255 }).notNull(),
  file_path: text('file_path').notNull(),
  file_type: fileTypeEnum('file_type').notNull(),
  file_size: integer('file_size').notNull(),
  category_id: integer('category_id'),
  uploaded_by: integer('uploaded_by').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Access logs table
export const accessLogsTable = pgTable('access_logs', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  archive_id: integer('archive_id').notNull(),
  action: accessActionEnum('action').notNull(),
  ip_address: varchar('ip_address', { length: 45 }),
  user_agent: text('user_agent'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  uploadedArchives: many(archivesTable),
  accessLogs: many(accessLogsTable)
}));

export const categoriesRelations = relations(categoriesTable, ({ many }) => ({
  archives: many(archivesTable)
}));

export const archivesRelations = relations(archivesTable, ({ one, many }) => ({
  category: one(categoriesTable, {
    fields: [archivesTable.category_id],
    references: [categoriesTable.id]
  }),
  uploader: one(usersTable, {
    fields: [archivesTable.uploaded_by],
    references: [usersTable.id]
  }),
  accessLogs: many(accessLogsTable)
}));

export const accessLogsRelations = relations(accessLogsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [accessLogsTable.user_id],
    references: [usersTable.id]
  }),
  archive: one(archivesTable, {
    fields: [accessLogsTable.archive_id],
    references: [archivesTable.id]
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Category = typeof categoriesTable.$inferSelect;
export type NewCategory = typeof categoriesTable.$inferInsert;

export type Archive = typeof archivesTable.$inferSelect;
export type NewArchive = typeof archivesTable.$inferInsert;

export type AccessLog = typeof accessLogsTable.$inferSelect;
export type NewAccessLog = typeof accessLogsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  categories: categoriesTable,
  archives: archivesTable,
  accessLogs: accessLogsTable
};
