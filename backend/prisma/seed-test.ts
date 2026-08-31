import {
  PrismaClient,
  Gender,
  GenderPreference,
  DatingGoal,
  SwipeAction,
  MessageType,
} from "@prisma/client";

const prisma = new PrismaClient();

const FEMALE_COUNT = 20;
const MALE_COUNT = 10;

const femaleNames = [
  "Sofia",
  "Emma",
  "Olivia",
  "Mia",
  "Ava",
  "Lina",
  "Nora",
  "Ella",
  "Sara",
  "Lily",
  "Amelia",
  "Chloe",
  "Aria",
  "Maya",
  "Layla",
  "Zoe",
  "Elena",
  "Nina",
  "Leah",
  "Clara",
];

const maleNames = [
  "Alex",
  "Daniel",
  "Ryan",
  "Leo",
  "Adam",
  "Noah",
  "Ethan",
  "Lucas",
  "Oliver",
  "Max",
];

const cities = [
  "Dubai",
  "Istanbul",
  "London",
  "Paris",
  "Berlin",
  "Toronto",
  "New York",
  "Los Angeles",
  "Amsterdam",
  "Barcelona",
];

const interests = [
  "Travel",
  "Music",
  "Movies",
  "Fitness",
  "Photography",
  "Food",
  "Dancing",
  "Gaming",
  "Books",
  "Art",
];

const bios = [
  "Love travelling, good conversations and discovering new places.",
  "Looking for someone kind, fun and open-minded.",
  "Coffee, music, sunsets and spontaneous adventures.",
  "I enjoy meeting interesting people and trying new things.",
  "Life is better when you have someone to share it with.",
  "Always ready for a new adventure ✨",
];

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomAge(min = 20, max = 34): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomInterests(): string[] {
  const shuffled = [...interests].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3 + Math.floor(Math.random() * 3));
}

async function createTestUser(gender: Gender, index: number, name: string) {
  const username =
    gender === Gender.FEMALE
      ? `fake_female_${String(index).padStart(2, "0")}`
      : `fake_male_${String(index).padStart(2, "0")}`;

  const telegramId =
    gender === Gender.FEMALE
      ? BigInt(`900000${String(index).padStart(2, "0")}`)
      : BigInt(`910000${String(index).padStart(2, "0")}`);

  const city = randomItem(cities);

  const user = await prisma.user.upsert({
    where: {
      telegramId,
    },
    update: {
      username,
      firstName: name,
      lastName: null,
      languageCode: "en",
      status: "ACTIVE",
      lastActiveAt: new Date(),
    },
    create: {
      telegramId,
      username,
      firstName: name,
      languageCode: "en",
      status: "ACTIVE",
      profile: {
        create: {
          displayName: name,
          age: randomAge(),
          gender,
          genderPref:
            gender === Gender.FEMALE
              ? GenderPreference.MALE
              : GenderPreference.FEMALE,
          bio: randomItem(bios),
          city,
          country: "Test",
          interests: randomInterests(),
          spokenLanguages: ["en"],
          datingGoal: randomItem([
            DatingGoal.DATING,
            DatingGoal.RELATIONSHIP,
            DatingGoal.CHAT,
          ]),
          minAgePref: 18,
          maxAgePref: 40,
          maxDistanceKm: 100,
          isComplete: true,
          isVisible: true,
          isPriority: false,
        },
      },
    },
    include: {
      profile: true,
    },
  });

  await prisma.photo.deleteMany({
    where: {
      userId: user.id,
    },
  });

  await prisma.photo.create({
    data: {
      userId: user.id,
      url: `https://i.pravatar.cc/600?img=${gender === Gender.FEMALE ? index : index + 30}`,
      storageKey: `test/fake-users/${username}/avatar.jpg`,
      position: 0,
      isModerated: true,
      isApproved: true,
    },
  });

  return user;
}

async function main() {
  console.log("🌱 Starting test data seed...\n");

  const femaleUsers = [];

  for (let i = 1; i <= FEMALE_COUNT; i++) {
    const user = await createTestUser(Gender.FEMALE, i, femaleNames[i - 1]);

    femaleUsers.push(user);

    console.log(`👩 Created/updated ${user.username}`);
  }

  const maleUsers = [];

  for (let i = 1; i <= MALE_COUNT; i++) {
    const user = await createTestUser(Gender.MALE, i, maleNames[i - 1]);

    maleUsers.push(user);

    console.log(`👨 Created/updated ${user.username}`);
  }

  console.log("\n❤️ Creating test likes...");

  /*
   * Female 01-05 like Male 01.
   * Male 01 likes Female 01-03.
   *
   * This gives us several realistic Like/Match scenarios.
   */

  for (let i = 0; i < 5; i++) {
    await prisma.like.upsert({
      where: {
        fromUserId_toUserId: {
          fromUserId: femaleUsers[i].id,
          toUserId: maleUsers[0].id,
        },
      },
      update: {
        action: SwipeAction.LIKE,
      },
      create: {
        fromUserId: femaleUsers[i].id,
        toUserId: maleUsers[0].id,
        action: SwipeAction.LIKE,
      },
    });
  }

  for (let i = 0; i < 3; i++) {
    await prisma.like.upsert({
      where: {
        fromUserId_toUserId: {
          fromUserId: maleUsers[0].id,
          toUserId: femaleUsers[i].id,
        },
      },
      update: {
        action: SwipeAction.LIKE,
      },
      create: {
        fromUserId: maleUsers[0].id,
        toUserId: femaleUsers[i].id,
        action: SwipeAction.LIKE,
      },
    });
  }

  console.log("✅ Test likes created.");

  console.log("\n🎯 Creating test matches...");

  /*
   * These are intentionally created directly so that
   * the Chat UI can be tested immediately.
   *
   * Later we will also test Match creation through the
   * actual Like → Like flow.
   */

  for (let i = 0; i < 3; i++) {
    const userAId = maleUsers[0].id;
    const userBId = femaleUsers[i].id;

    const existing = await prisma.match.findFirst({
      where: {
        OR: [
          {
            userAId,
            userBId,
          },
          {
            userAId: userBId,
            userBId: userAId,
          },
        ],
      },
    });

    if (!existing) {
      await prisma.match.create({
        data: {
          userAId,
          userBId,
          isActive: true,
        },
      });
    }
  }

  console.log("✅ Test matches created.");

  console.log("\n💬 Creating test messages...");

  const matches = await prisma.match.findMany({
    where: {
      userAId: maleUsers[0].id,
      userBId: {
        in: femaleUsers.slice(0, 3).map((u) => u.id),
      },
    },
  });

  for (const match of matches) {
    const existingMessage = await prisma.message.findFirst({
      where: {
        matchId: match.id,
      },
    });

    if (!existingMessage) {
      await prisma.message.create({
        data: {
          matchId: match.id,
          senderId: match.userBId,
          type: MessageType.TEXT,
          content: "Hey! Nice to meet you 👋",
          isRead: false,
        },
      });

      await prisma.message.create({
        data: {
          matchId: match.id,
          senderId: match.userAId,
          type: MessageType.TEXT,
          content: "Hey! Nice to meet you too 😊",
          isRead: true,
        },
      });
    }
  }

  console.log("✅ Test messages created.");

  console.log("\n");
  console.log("======================================");
  console.log("🎉 TEST DATA SEED COMPLETED");
  console.log("======================================");
  console.log(`👩 Female users: ${femaleUsers.length}`);
  console.log(`👨 Male users:   ${maleUsers.length}`);
  console.log("❤️ Likes:        created");
  console.log("💘 Matches:       created");
  console.log("💬 Messages:      created");
  console.log("======================================\n");
}

main()
  .catch((error) => {
    console.error("\n❌ Seed failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
