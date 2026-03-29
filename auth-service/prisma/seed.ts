import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { id: "223e4567-e89b-12d3-a456-426614174006" },
    update: {},
    create: {
      id: "223e4567-e89b-12d3-a456-426614174006",
      email: "testuser@test.com",
      password:
        "$2b$12$7hoRZfJrRKD2nIm2vHLs7OBETy.LWenXXMLKf99W8M4PUwO6KB7fu",
      role: "ADMIN",
    },
  });

  console.log("Seed completed: test user upserted");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
