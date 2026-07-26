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
