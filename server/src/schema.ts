
import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['admin', 'user']);
export type UserRole = z.infer<typeof userRoleSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  role: userRoleSchema,
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Category schema
export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Category = z.infer<typeof categorySchema>;

// Archive file type enum
export const archiveFileTypeSchema = z.enum(['pdf', 'docx', 'jpg', 'jpeg', 'png', 'gif', 'other']);
export type ArchiveFileType = z.infer<typeof archiveFileTypeSchema>;

// Archive schema
export const archiveSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  file_name: z.string(),
  file_path: z.string(),
  file_type: archiveFileTypeSchema,
  file_size: z.number(),
  category_id: z.number().nullable(),
  uploaded_by: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Archive = z.infer<typeof archiveSchema>;

// Access log schema
export const accessLogSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  archive_id: z.number(),
  action: z.enum(['view', 'download', 'upload', 'delete']),
  ip_address: z.string().nullable(),
  user_agent: z.string().nullable(),
  created_at: z.coerce.date()
});

export type AccessLog = z.infer<typeof accessLogSchema>;

// Input schemas for user management
export const createUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  role: userRoleSchema.default('user')
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const updateUserInputSchema = z.object({
  id: z.number(),
  email: z.string().email().optional(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  role: userRoleSchema.optional(),
  is_active: z.boolean().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Input schemas for category management
export const createCategoryInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional()
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

export const updateCategoryInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional()
});

export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>;

// Input schemas for archive management
export const createArchiveInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  file_name: z.string(),
  file_path: z.string(),
  file_type: archiveFileTypeSchema,
  file_size: z.number().positive(),
  category_id: z.number().nullable().optional(),
  uploaded_by: z.number()
});

export type CreateArchiveInput = z.infer<typeof createArchiveInputSchema>;

export const updateArchiveInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  category_id: z.number().nullable().optional()
});

export type UpdateArchiveInput = z.infer<typeof updateArchiveInputSchema>;

export const searchArchivesInputSchema = z.object({
  query: z.string().optional(),
  category_id: z.number().optional(),
  file_type: archiveFileTypeSchema.optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0)
});

export type SearchArchivesInput = z.infer<typeof searchArchivesInputSchema>;

// Input schema for access logging
export const createAccessLogInputSchema = z.object({
  user_id: z.number(),
  archive_id: z.number(),
  action: z.enum(['view', 'download', 'upload', 'delete']),
  ip_address: z.string().nullable().optional(),
  user_agent: z.string().nullable().optional()
});

export type CreateAccessLogInput = z.infer<typeof createAccessLogInputSchema>;

// Dashboard statistics schema
export const dashboardStatsSchema = z.object({
  total_users: z.number(),
  total_archives: z.number(),
  total_categories: z.number(),
  recent_uploads: z.number(),
  recent_accesses: z.number(),
  storage_used: z.number()
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

// Archive with related data schema
export const archiveWithDetailsSchema = archiveSchema.extend({
  category: categorySchema.nullable(),
  uploader: userSchema.pick({ id: true, first_name: true, last_name: true })
});

export type ArchiveWithDetails = z.infer<typeof archiveWithDetailsSchema>;
