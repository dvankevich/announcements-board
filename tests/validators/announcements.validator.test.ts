import { describe, it, expect } from "vitest";
import {
  AnnouncementUserSchema,
  AnnouncementSchema,
  PaginationSchema,
  AnnouncementsListSchema,
  GetAnnouncementsQuerySchema,
  AnnouncementIdParamSchema,
  CreateAnnouncementSchema,
  UpdateAnnouncementSchema,
} from "../../src/validators/announcements.validator.ts";

describe("AnnouncementUserSchema", () => {
  const valid = {
    id: 1,
    username: "ivan_petrenko",
    email: "ivan@example.com",
    name: "Ivan",
  };

  it("should accept valid data", () => {
    expect(AnnouncementUserSchema.safeParse(valid).success).toBe(true);
  });

  it("should reject non-positive id", () => {
    expect(
      AnnouncementUserSchema.safeParse({ ...valid, id: 0 }).success,
    ).toBe(false);
  });

  it("should reject invalid email", () => {
    expect(
      AnnouncementUserSchema.safeParse({ ...valid, email: "bad" }).success,
    ).toBe(false);
  });
});

describe("AnnouncementSchema", () => {
  const valid = {
    id: 5,
    title: "Selling ASUS laptop",
    description: "Excellent condition, 16GB RAM",
    price: 18000,
    category: "sale",
    imageUrl: "https://res.cloudinary.com/demo/image/upload/v1/announcements/abc123.jpg",
    createdAt: "2025-01-10T12:00:00.000Z",
    updatedAt: "2025-01-10T12:00:00.000Z",
    user: {
      id: 1,
      username: "ivan_petrenko",
      email: "ivan@example.com",
      name: "Ivan",
    },
  };

  it("should accept valid data", () => {
    expect(AnnouncementSchema.safeParse(valid).success).toBe(true);
  });

  it("should accept null imageUrl", () => {
    expect(
      AnnouncementSchema.safeParse({ ...valid, imageUrl: null }).success,
    ).toBe(true);
  });

  it("should accept missing imageUrl", () => {
    const { imageUrl, ...withoutImage } = valid;
    expect(AnnouncementSchema.safeParse(withoutImage).success).toBe(true);
  });

  it("should reject invalid imageUrl", () => {
    expect(
      AnnouncementSchema.safeParse({ ...valid, imageUrl: "not-a-url" }).success,
    ).toBe(false);
  });

  it("should reject invalid datetime", () => {
    expect(
      AnnouncementSchema.safeParse({
        ...valid,
        createdAt: "not-a-date",
      }).success,
    ).toBe(false);
  });
});

describe("PaginationSchema", () => {
  it("should accept valid pagination", () => {
    const result = PaginationSchema.safeParse({
      total: 23,
      page: 2,
      totalPages: 3,
      perPage: 10,
    });
    expect(result.success).toBe(true);
  });
});

describe("AnnouncementsListSchema", () => {
  it("should accept valid list response shape", () => {
    const result = AnnouncementsListSchema.safeParse({
      data: [],
      pagination: {
        total: 0,
        page: 1,
        totalPages: 0,
        perPage: 10,
      },
    });
    expect(result.success).toBe(true);
  });
});

describe("GetAnnouncementsQuerySchema", () => {
  it("should accept empty query and apply default page=1", () => {
    const result = GetAnnouncementsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
    }
  });

  it("should coerce page from string", () => {
    const result = GetAnnouncementsQuerySchema.safeParse({ page: "3" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
    }
  });

  it("should reject page < 1", () => {
    expect(GetAnnouncementsQuerySchema.safeParse({ page: 0 }).success).toBe(
      false,
    );
  });

  it("should accept search and sort=oldest", () => {
    const result = GetAnnouncementsQuerySchema.safeParse({
      search: "laptop",
      sort: "oldest",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid sort value", () => {
    expect(
      GetAnnouncementsQuerySchema.safeParse({ sort: "newest" }).success,
    ).toBe(false);
  });
});

describe("AnnouncementIdParamSchema", () => {
  it("should accept valid id", () => {
    const result = AnnouncementIdParamSchema.safeParse({ id: "5" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(5);
    }
  });

  it("should reject non-positive id", () => {
    expect(AnnouncementIdParamSchema.safeParse({ id: 0 }).success).toBe(false);
  });

  it("should reject non-numeric id", () => {
    expect(AnnouncementIdParamSchema.safeParse({ id: "abc" }).success).toBe(
      false,
    );
  });
});

describe("CreateAnnouncementSchema", () => {
  const valid = {
    title: "Selling a mountain bike",
    description: "Mountain bike, 21 speeds, good condition",
    price: 8000,
    category: "sale",
  };

  it("should accept valid data", () => {
    expect(CreateAnnouncementSchema.safeParse(valid).success).toBe(true);
  });

  it("should coerce price from string", () => {
    const result = CreateAnnouncementSchema.safeParse({
      ...valid,
      price: "8000",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price).toBe(8000);
    }
  });

  it("should reject title shorter than 5 characters", () => {
    expect(
      CreateAnnouncementSchema.safeParse({ ...valid, title: "abc" }).success,
    ).toBe(false);
  });

  it("should reject title longer than 50 characters", () => {
    expect(
      CreateAnnouncementSchema.safeParse({
        ...valid,
        title: "a".repeat(51),
      }).success,
    ).toBe(false);
  });

  it("should reject description shorter than 10 characters", () => {
    expect(
      CreateAnnouncementSchema.safeParse({
        ...valid,
        description: "short",
      }).success,
    ).toBe(false);
  });

  it("should reject non-positive price", () => {
    expect(
      CreateAnnouncementSchema.safeParse({ ...valid, price: 0 }).success,
    ).toBe(false);
  });

  it("should reject invalid category", () => {
    expect(
      CreateAnnouncementSchema.safeParse({
        ...valid,
        category: "exchange",
      }).success,
    ).toBe(false);
  });

  it("should accept all allowed categories", () => {
    for (const category of ["sale", "service", "job", "other", "buy", "rent"]) {
      expect(
        CreateAnnouncementSchema.safeParse({ ...valid, category }).success,
      ).toBe(true);
    }
  });

  it("should accept optional image", () => {
    expect(
      CreateAnnouncementSchema.safeParse({
        ...valid,
        image: "some-file",
      }).success,
    ).toBe(true);
  });
});

describe("UpdateAnnouncementSchema", () => {
  it("should reject empty object (at least one field required)", () => {
    const result = UpdateAnnouncementSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("should reject object with only empty strings", () => {
    const result = UpdateAnnouncementSchema.safeParse({
      title: "",
      description: "",
      price: "",
      category: "",
    });
    expect(result.success).toBe(false);
  });

  it("should accept partial update", () => {
    const result = UpdateAnnouncementSchema.safeParse({
      title: "Updated title here",
      price: 6500,
    });
    expect(result.success).toBe(true);
  });

  it("should turn empty string into undefined (preprocess)", () => {
    const result = UpdateAnnouncementSchema.safeParse({
      title: "",
      description: "",
      price: "",
      category: "",
      image: "some-file", // ← залишаємо хоча б одне поле
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBeUndefined();
      expect(result.data.description).toBeUndefined();
      expect(result.data.price).toBeUndefined();
      expect(result.data.category).toBeUndefined();
      expect(result.data.image).toBe("some-file");
    }
  });

  it("should reject title shorter than 5 when provided", () => {
    expect(
      UpdateAnnouncementSchema.safeParse({ title: "abc" }).success,
    ).toBe(false);
  });

  it("should reject description shorter than 10 when provided", () => {
    expect(
      UpdateAnnouncementSchema.safeParse({ description: "short" }).success,
    ).toBe(false);
  });

  it("should reject non-positive price when provided", () => {
    expect(UpdateAnnouncementSchema.safeParse({ price: 0 }).success).toBe(
      false,
    );
  });

  it("should reject invalid category when provided", () => {
    expect(
      UpdateAnnouncementSchema.safeParse({ category: "rent" }).success,
    ).toBe(false);
  });

  it("should coerce price from string", () => {
    const result = UpdateAnnouncementSchema.safeParse({ price: "6500" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price).toBe(6500);
    }
  });

  it("should accept update with only image", () => {
    const result = UpdateAnnouncementSchema.safeParse({
      image: "some-file",
    });
    expect(result.success).toBe(true);
  });

  it("should accept update with only image and keep other fields undefined", () => {
  const result = UpdateAnnouncementSchema.safeParse({
    image: "some-file",
  });

  expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.image).toBe("some-file");
      expect(result.data.title).toBeUndefined();
      expect(result.data.description).toBeUndefined();
      expect(result.data.price).toBeUndefined();
      expect(result.data.category).toBeUndefined();
    }
  });
});
