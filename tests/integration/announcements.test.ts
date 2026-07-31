import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import request from "supertest";
import app from "../../app.ts";
import prisma from "../../prisma/client.ts";

// Mock Cloudinary
vi.mock("../../src/config/cloudinary.ts", () => ({
  default: {
    uploader: {
      upload: vi.fn().mockResolvedValue({
        secure_url:
          "https://res.cloudinary.com/demo/image/upload/v1/announcements/test.jpg",
        public_id: "announcements/test",
      }),
      destroy: vi.fn().mockResolvedValue({ result: "ok" }),
    },
  },
}));

const userA = {
  username: "owner_user",
  email: "owner@example.com",
  password: "securepass123",
  name: "Owner User",
};

const userB = {
  username: "other_user",
  email: "other@example.com",
  password: "securepass123",
  name: "Other User",
};

const announcementData = {
  title: "Selling a mountain bike",
  description: "Mountain bike, 21 speeds, good condition",
  price: 8000,
  category: "sale",
};

async function cleanDatabase() {
  await prisma.refreshToken.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.user.deleteMany();
}

async function registerAndGetToken(user: typeof userA) {
  const res = await request(app).post("/api/auth/register").send(user);
  return {
    accessToken: res.body.accessToken as string,
    userId: res.body.user.id as number,
  };
}

async function createAnnouncement(token: string, data = announcementData) {
  return request(app)
    .post("/api/announcements")
    .set("Authorization", `Bearer ${token}`)
    .send(data);
}

describe("Announcements API (integration)", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  // ---------- GET /api/announcements ----------

  describe("GET /api/announcements", () => {
    it("should return empty list when no announcements", async () => {
      const res = await request(app).get("/api/announcements").expect(200);

      expect(res.body).toEqual({
        data: [],
        pagination: {
          total: 0,
          page: 1,
          totalPages: 0,
          perPage: 10,
        },
      });
    });

    it("should return paginated announcements", async () => {
      const { accessToken } = await registerAndGetToken(userA);

      for (let i = 1; i <= 12; i++) {
        await createAnnouncement(accessToken, {
          ...announcementData,
          title: `Announcement number ${i}`,
        });
      }

      const res = await request(app)
        .get("/api/announcements?page=1")
        .expect(200);

      expect(res.body.data).toHaveLength(10);
      expect(res.body.pagination).toMatchObject({
        total: 12,
        page: 1,
        totalPages: 2,
        perPage: 10,
      });

      const resPage2 = await request(app)
        .get("/api/announcements?page=2")
        .expect(200);

      expect(resPage2.body.data).toHaveLength(2);
      expect(resPage2.body.pagination.page).toBe(2);
    });

    it("should search by title (case-insensitive)", async () => {
      const { accessToken } = await registerAndGetToken(userA);

      await createAnnouncement(accessToken, {
        ...announcementData,
        title: "Selling ASUS laptop",
      });
      await createAnnouncement(accessToken, {
        ...announcementData,
        title: "Old bicycle for sale",
      });

      const res = await request(app)
        .get("/api/announcements?search=asus")
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toContain("ASUS");
    });

    it("should sort by oldest first when sort=oldest", async () => {
      const { accessToken } = await registerAndGetToken(userA);

      const first = await createAnnouncement(accessToken, {
        ...announcementData,
        title: "First announcement here",
      });
      const second = await createAnnouncement(accessToken, {
        ...announcementData,
        title: "Second announcement here",
      });

      const res = await request(app)
        .get("/api/announcements?sort=oldest")
        .expect(200);

      expect(res.body.data[0].id).toBe(first.body.id);
      expect(res.body.data[1].id).toBe(second.body.id);
    });

    it("should return 400 for invalid page", async () => {
      const res = await request(app)
        .get("/api/announcements?page=0")
        .expect(400);

      expect(res.body.error).toBe("Invalid query parameters");
    });
  });

  // ---------- GET /api/announcements/:id ----------

  describe("GET /api/announcements/:id", () => {
    it("should return announcement by id", async () => {
      const { accessToken } = await registerAndGetToken(userA);
      const created = await createAnnouncement(accessToken);

      const res = await request(app)
        .get(`/api/announcements/${created.body.id}`)
        .expect(200);

      expect(res.body).toMatchObject({
        id: created.body.id,
        title: announcementData.title,
        description: announcementData.description,
        price: announcementData.price,
        category: announcementData.category,
        user: {
          username: userA.username,
          email: userA.email,
          name: userA.name,
        },
      });
    });

    it("should return 404 for non-existent id", async () => {
      const res = await request(app).get("/api/announcements/99999").expect(404);

      expect(res.body).toEqual({ error: "Announcement not found" });
    });

    it("should return 400 for invalid id", async () => {
      const res = await request(app).get("/api/announcements/abc").expect(400);

      expect(res.body.error).toBe("Invalid parameters");
    });
  });

  // ---------- POST /api/announcements ----------

  describe("POST /api/announcements", () => {
    it("should create announcement when authenticated", async () => {
      const { accessToken, userId } = await registerAndGetToken(userA);

      const res = await request(app)
        .post("/api/announcements")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(announcementData)
        .expect(201);

      expect(res.body).toMatchObject({
        id: expect.any(Number),
        title: announcementData.title,
        description: announcementData.description,
        price: announcementData.price,
        category: announcementData.category,
        user: {
          id: userId,
          username: userA.username,
        },
      });

      const inDb = await prisma.announcement.findUnique({
        where: { id: res.body.id },
      });
      expect(inDb).not.toBeNull();
      expect(inDb!.userId).toBe(userId);
    });

    it("should return 401 without token", async () => {
      const res = await request(app)
        .post("/api/announcements")
        .send(announcementData)
        .expect(401);

      expect(res.body).toEqual({ error: "Authentication required" });
    });

    it("should return 422 for invalid body", async () => {
      const { accessToken } = await registerAndGetToken(userA);

      const res = await request(app)
        .post("/api/announcements")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          title: "ab",
          description: "short",
          price: -1,
          category: "invalid",
        })
        .expect(422);

      expect(res.body.error).toBe("Validation failed");
      expect(res.body.details).toBeDefined();
    });

    it("should accept all allowed categories", async () => {
      const { accessToken } = await registerAndGetToken(userA);

      for (const category of ["sale", "service", "job", "other"]) {
        const res = await request(app)
          .post("/api/announcements")
          .set("Authorization", `Bearer ${accessToken}`)
          .send({ ...announcementData, category, title: `Title for ${category}` })
          .expect(201);

        expect(res.body.category).toBe(category);
      }
    });
  });

  // ---------- PATCH /api/announcements/:id ----------

  describe("PATCH /api/announcements/:id", () => {
    it("should update own announcement", async () => {
      const { accessToken } = await registerAndGetToken(userA);
      const created = await createAnnouncement(accessToken);

      const res = await request(app)
        .patch(`/api/announcements/${created.body.id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          title: "Updated title here",
          price: 6500,
        })
        .expect(200);

      expect(res.body.title).toBe("Updated title here");
      expect(res.body.price).toBe(6500);
      expect(res.body.description).toBe(announcementData.description);
    });

    it("should return 403 when updating someone else's announcement", async () => {
      const owner = await registerAndGetToken(userA);
      const other = await registerAndGetToken(userB);

      const created = await createAnnouncement(owner.accessToken);

      const res = await request(app)
        .patch(`/api/announcements/${created.body.id}`)
        .set("Authorization", `Bearer ${other.accessToken}`)
        .send({ title: "Hacked title here" })
        .expect(403);

      expect(res.body).toEqual({ error: "Access denied" });
    });

    it("should return 404 for non-existent announcement", async () => {
      const { accessToken } = await registerAndGetToken(userA);

      const res = await request(app)
        .patch("/api/announcements/99999")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ title: "Updated title here" })
        .expect(404);

      expect(res.body).toEqual({ error: "Announcement not found" });
    });

    it("should return 401 without token", async () => {
      const res = await request(app)
        .patch("/api/announcements/1")
        .send({ title: "Updated title here" })
        .expect(401);

      expect(res.body).toEqual({ error: "Authentication required" });
    });

    it("should return 422 for empty update body", async () => {
      const { accessToken } = await registerAndGetToken(userA);
      const created = await createAnnouncement(accessToken);

      const res = await request(app)
        .patch(`/api/announcements/${created.body.id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({})
        .expect(422);

      expect(res.body.error).toMatch(/at least one field|Validation failed/i);
    });
  });

  // ---------- DELETE /api/announcements/:id ----------

  describe("DELETE /api/announcements/:id", () => {
    it("should delete own announcement", async () => {
      const { accessToken } = await registerAndGetToken(userA);
      const created = await createAnnouncement(accessToken);

      await request(app)
        .delete(`/api/announcements/${created.body.id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(204);

      const inDb = await prisma.announcement.findUnique({
        where: { id: created.body.id },
      });
      expect(inDb).toBeNull();
    });

    it("should return 403 when deleting someone else's announcement", async () => {
      const owner = await registerAndGetToken(userA);
      const other = await registerAndGetToken(userB);

      const created = await createAnnouncement(owner.accessToken);

      const res = await request(app)
        .delete(`/api/announcements/${created.body.id}`)
        .set("Authorization", `Bearer ${other.accessToken}`)
        .expect(403);

      expect(res.body).toEqual({ error: "Access denied" });

      // Оголошення залишилось
      const inDb = await prisma.announcement.findUnique({
        where: { id: created.body.id },
      });
      expect(inDb).not.toBeNull();
    });

    it("should return 404 for non-existent announcement", async () => {
      const { accessToken } = await registerAndGetToken(userA);

      const res = await request(app)
        .delete("/api/announcements/99999")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(404);

      expect(res.body).toEqual({ error: "Announcement not found" });
    });

    it("should return 401 without token", async () => {
      const res = await request(app).delete("/api/announcements/1").expect(401);

      expect(res.body).toEqual({ error: "Authentication required" });
    });
  });
});
