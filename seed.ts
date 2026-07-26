import prisma from "./prisma/client.ts";

async function main() {
  const user = await prisma.user.findFirst();

  if (!user) {
    console.log("No users found. Please register first via POST /api/auth/register");
    return;
  }

  // Clear previous announcements (optional, useful during development)
  await prisma.announcement.deleteMany();

  const announcementsData = [
    {
      title: "Selling ASUS laptop",
      description: "Excellent condition, 16GB RAM, barely used",
      price: 18000,
      category: "sale",
    },
    {
      title: "iPhone 14 Pro for sale",
      description: "256GB, battery health 94%, with original box",
      price: 32000,
      category: "sale",
    },
    {
      title: "Looking for a bicycle",
      description: "Need a mountain bike in good condition, budget up to 8000",
      price: 8000,
      category: "buy",
    },
    {
      title: "Apartment for rent",
      description: "1-room apartment in the city center, fully furnished",
      price: 12000,
      category: "rent",
    },
    {
      title: "MacBook Air M2",
      description: "2023 model, 16GB / 512GB, like new",
      price: 42000,
      category: "sale",
    },
    {
      title: "Gaming PC",
      description: "RTX 4070, Ryzen 7, 32GB RAM, great for gaming and work",
      price: 35000,
      category: "sale",
    },
    {
      title: "Office chair",
      description: "Ergonomic chair, adjustable height and lumbar support",
      price: 3500,
      category: "sale",
    },
    {
      title: "Looking for monitor",
      description: "Need 27\" 144Hz monitor, preferably IPS",
      price: 7000,
      category: "buy",
    },
    {
      title: "Electric scooter",
      description: "Xiaomi Pro 2, low mileage, includes charger",
      price: 11000,
      category: "sale",
    },
    {
      title: "Freelance web development",
      description: "I create modern websites and landing pages. Portfolio available",
      price: 0,
      category: "service",
    },
    {
      title: "Selling mechanical keyboard",
      description: "Keychron K8, brown switches, RGB",
      price: 2800,
      category: "sale",
    },
    {
      title: "Sofa for sale",
      description: "Comfortable 3-seater sofa, good condition",
      price: 9500,
      category: "sale",
    },
  ];

  const created = await Promise.all(
    announcementsData.map((item) =>
      prisma.announcement.create({
        data: {
          ...item,
          userId: user.id,
        },
      }),
    ),
  );

  console.log(`Created ${created.length} announcements for user "${user.username}"`);
}

try {
  await main();
} catch (error) {
  console.error(error);
} finally {
  await prisma.$disconnect();
}
