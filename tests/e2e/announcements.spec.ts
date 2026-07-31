import { test, expect } from "@playwright/test";
import {
  cleanDatabase,
  registerAndGetToken,
  announcementData,
  userA,
  userB,
} from "./helpers.ts";

test.describe("Announcements E2E", () => {
  test.beforeEach(async () => {
    await cleanDatabase();
  });

  test("public list is empty initially", async ({ request }) => {
    const res = await request.get("/api/announcements");
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.pagination.total).toBe(0);
  });

  test("full ownership flow: create → read → update → delete", async ({
    request,
  }) => {
    const { accessToken } = await registerAndGetToken(request);

    // Create
    const createRes = await request.post("/api/announcements", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: announcementData,
    });
    expect(createRes.status()).toBe(201);
    const created = await createRes.json();
    expect(created.title).toBe(announcementData.title);

    // Public get by id
    const getRes = await request.get(`/api/announcements/${created.id}`);
    expect(getRes.status()).toBe(200);
    expect((await getRes.json()).id).toBe(created.id);

    // Update
    const patchRes = await request.patch(`/api/announcements/${created.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { title: "Updated mountain bike title", price: 6500 },
    });
    expect(patchRes.status()).toBe(200);
    const updated = await patchRes.json();
    expect(updated.title).toBe("Updated mountain bike title");
    expect(updated.price).toBe(6500);

    // Delete
    const deleteRes = await request.delete(`/api/announcements/${created.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(deleteRes.status()).toBe(204);

    // Gone
    const missing = await request.get(`/api/announcements/${created.id}`);
    expect(missing.status()).toBe(404);
  });

  test("other user cannot update or delete", async ({ request }) => {
    const owner = await registerAndGetToken(request, userA);
    const other = await registerAndGetToken(request, userB);

    const createRes = await request.post("/api/announcements", {
      headers: { Authorization: `Bearer ${owner.accessToken}` },
      data: announcementData,
    });
    const created = await createRes.json();

    const patchRes = await request.patch(`/api/announcements/${created.id}`, {
      headers: { Authorization: `Bearer ${other.accessToken}` },
      data: { title: "Hacked title value" },
    });
    expect(patchRes.status()).toBe(403);

    const deleteRes = await request.delete(`/api/announcements/${created.id}`, {
      headers: { Authorization: `Bearer ${other.accessToken}` },
    });
    expect(deleteRes.status()).toBe(403);
  });

  test("search and pagination", async ({ request }) => {
    const { accessToken } = await registerAndGetToken(request);

    for (let i = 1; i <= 12; i++) {
      await request.post("/api/announcements", {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: {
          ...announcementData,
          title: i === 5 ? "Unique ASUS laptop deal" : `Announcement item ${i}`,
        },
      });
    }

    const page1 = await request.get("/api/announcements?page=1");
    expect(page1.status()).toBe(200);
    const page1Body = await page1.json();
    expect(page1Body.data).toHaveLength(10);
    expect(page1Body.pagination.totalPages).toBe(2);

    const search = await request.get("/api/announcements?search=asus");
    const searchBody = await search.json();
    expect(searchBody.data).toHaveLength(1);
    expect(searchBody.data[0].title).toMatch(/ASUS/i);
  });

  test("create without token returns 401", async ({ request }) => {
    const res = await request.post("/api/announcements", {
      data: announcementData,
    });
    expect(res.status()).toBe(401);
  });
});
