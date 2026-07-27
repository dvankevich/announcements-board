import { z } from "zod";
import { registry } from "../openapi.ts";

// ---------- Schemas ----------

export const AnnouncementUserSchema = registry.register(
  "AnnouncementUser",
  z.object({
    id: z.number().int().positive().openapi({ example: 1 }),
    username: z.string().openapi({ example: "ivan_petrenko" }),
    email: z.email().openapi({ example: "ivan@example.com" }),
    name: z.string().openapi({ example: "Ivan" }),
  }),
);

export const AnnouncementSchema = registry.register(
  "Announcement",
  z.object({
    id: z.number().int().positive().openapi({ example: 5 }),
    title: z.string().openapi({ example: "Selling ASUS laptop" }),
    description: z
      .string()
      .openapi({ example: "Excellent condition, 16GB RAM" }),
    price: z.number().int().openapi({ example: 18000 }),
    category: z.string().openapi({ example: "sale" }),
    createdAt: z
      .iso.datetime()
      .openapi({ example: "2025-01-10T12:00:00.000Z" }),
    updatedAt: z
      .iso.datetime()
      .openapi({ example: "2025-01-10T12:00:00.000Z" }),
    user: AnnouncementUserSchema,
  }),
);

export const PaginationSchema = registry.register(
  "Pagination",
  z.object({
    total: z.number().int().openapi({ example: 23 }),
    page: z.number().int().openapi({ example: 2 }),
    totalPages: z.number().int().openapi({ example: 3 }),
    perPage: z.number().int().openapi({ example: 10 }),
  }),
);

export const AnnouncementsListSchema = registry.register(
  "AnnouncementsList",
  z.object({
    data: z.array(AnnouncementSchema),
    pagination: PaginationSchema,
  }),
);

export const GetAnnouncementsQuerySchema = registry.register(
  "GetAnnouncementsQuery",
  z.object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1)
      .openapi({
        example: 1,
        description: "Page number (starts from 1)",
      }),
    search: z
      .string()
      .optional()
      .openapi({
        example: "laptop",
        description: "Search substring in title (case-insensitive)",
      }),
    sort: z
      .enum(["oldest"])
      .optional()
      .openapi({
        example: "oldest",
        description:
          "Default is newest first. Use 'oldest' to sort from oldest to newest",
      }),
  }),
);

export type GetAnnouncementsQuery = z.infer<typeof GetAnnouncementsQuerySchema>;

export const AnnouncementIdParamSchema = registry.register(
  "AnnouncementIdParam",
  z.object({
    id: z.coerce
      .number()
      .int()
      .positive()
      .openapi({ example: 5, description: "Announcement ID" }),
  }),
);

export type AnnouncementIdParam = z.infer<typeof AnnouncementIdParamSchema>;

export const CreateAnnouncementSchema = registry.register(
  "CreateAnnouncement",
  z.object({
    title: z
      .string()
      .min(5)
      .max(50)
      .openapi({ example: "Selling a mountain bike" }),
    description: z
      .string()
      .min(10)
      .openapi({ example: "Mountain bike, 21 speeds, good condition" }),
    price: z
      .number()
      .positive()
      .openapi({ example: 8000 }),
    category: z
      .enum(["sale", "service", "job", "other"])
      .openapi({ example: "sale" }),
  }),
);

export type CreateAnnouncementBody = z.infer<typeof CreateAnnouncementSchema>;

export const UpdateAnnouncementSchema = registry.register(
  "UpdateAnnouncement",
  z
    .object({
      title: z
        .string()
        .min(5)
        .max(50)
        .optional()
        .openapi({ example: "Selling a mountain bike urgently" }),
      description: z
        .string()
        .min(10)
        .optional()
        .openapi({ example: "Mountain bike, 21 speeds, good condition" }),
      price: z
        .number()
        .positive()
        .optional()
        .openapi({ example: 6500 }),
      category: z
        .enum(["sale", "service", "job", "other"])
        .optional()
        .openapi({ example: "sale" }),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided",
    }),
);

export type UpdateAnnouncementBody = z.infer<typeof UpdateAnnouncementSchema>;

// ---------- Paths ----------

registry.registerPath({
  method: "get",
  path: "/api/announcements",
  tags: ["Announcements"],
  summary: "List announcements",
  description:
    "Public route. Supports pagination, search by title and sorting.",
  request: {
    query: GetAnnouncementsQuerySchema,
  },
  responses: {
    200: {
      description: "List of announcements with pagination",
      content: {
        "application/json": { schema: AnnouncementsListSchema },
      },
    },
    400: { description: "Invalid query parameters" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/announcements/{id}",
  tags: ["Announcements"],
  summary: "Get announcement by ID",
  description: "Public route. Returns a single announcement with author data.",
  request: {
    params: AnnouncementIdParamSchema,
  },
  responses: {
    200: {
      description: "Announcement found",
      content: {
        "application/json": { schema: AnnouncementSchema },
      },
    },
    400: { description: "Invalid announcement ID" },
    404: { description: "Announcement not found" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/announcements",
  tags: ["Announcements"],
  summary: "Create a new announcement",
  description:
    "Protected route. Creates an announcement. Author is taken from the access token.",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: CreateAnnouncementSchema },
      },
    },
  },
  responses: {
    201: {
      description: "Announcement created successfully",
      content: {
        "application/json": { schema: AnnouncementSchema },
      },
    },
    401: { description: "Authentication required" },
    422: { description: "Validation error" },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/announcements/{id}",
  tags: ["Announcements"],
  summary: "Update announcement",
  description:
    "Protected route. Partially updates an announcement. Only the owner can update it.",
  security: [{ bearerAuth: [] }],
  request: {
    params: AnnouncementIdParamSchema,
    body: {
      content: {
        "application/json": { schema: UpdateAnnouncementSchema },
      },
    },
  },
  responses: {
    200: {
      description: "Announcement updated successfully",
      content: {
        "application/json": { schema: AnnouncementSchema },
      },
    },
    400: { description: "Invalid announcement ID" },
    401: { description: "Authentication required" },
    403: { description: "Access denied" },
    404: { description: "Announcement not found" },
    422: { description: "Validation error" },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/announcements/{id}",
  tags: ["Announcements"],
  summary: "Delete announcement",
  description:
    "Protected route. Deletes an announcement. Only the owner can delete it.",
  security: [{ bearerAuth: [] }],
  request: {
    params: AnnouncementIdParamSchema,
  },
  responses: {
    204: { description: "Announcement deleted successfully" },
    400: { description: "Invalid announcement ID" },
    401: { description: "Authentication required" },
    403: { description: "Access denied" },
    404: { description: "Announcement not found" },
  },
});
