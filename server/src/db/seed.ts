import { faker } from "@faker-js/faker";
import { db } from "./client.js";

faker.seed(42);

const USER_COUNT = 5000;

const HOBBIES = [
  "Hiking", "Photography", "Cooking", "Reading", "Football", "Yoga",
  "Painting", "Cycling", "Gaming", "Travel", "Chess", "Gardening",
  "Running", "Swimming", "Fishing", "Skiing", "Surfing", "Dancing",
  "Singing", "Writing", "Pottery", "Knitting", "Calligraphy", "Baking",
  "Camping", "Climbing", "Meditation", "Origami", "Woodworking",
  "Birdwatching", "Astronomy", "Sculpting", "Skateboarding", "Boxing",
  "Archery", "Sailing", "Volunteering", "Blogging", "Coding", "Basketball",
];

//Avatar colors
const AVATAR_PALETTE = [
  "purple", "coral", "green", "tan", "yellow", "lavender", "orange", "blue",
];

const NATIONALITIES = [
  "Brazil", "United States", "Germany", "Japan", "France", "India",
  "Nigeria", "Portugal", "United Kingdom", "Canada", "Australia", "Spain",
  "Italy", "Mexico", "South Korea", "China", "Egypt", "South Africa",
  "Argentina", "Netherlands", "Sweden", "Norway", "Poland", "Turkey",
  "Kenya", "Indonesia", "Philippines", "Vietnam", "Thailand", "Greece",
  "Ireland", "Switzerland", "Belgium", "Austria", "Czechia", "Denmark",
  "Finland", "New Zealand", "United Arab Emirates", "Saudi Arabia",
];

console.log(`Seeding ${USER_COUNT} users…`);

db.exec(`
  DELETE FROM user_hobbies;
  DELETE FROM hobbies;
  DELETE FROM users;
`);

const insertHobby = db.prepare<[string]>("INSERT INTO hobbies (name) VALUES (?)");
const hobbyIds = new Map<string, number>();

const insertHobbies = db.transaction((names: string[]) => {
  for (const name of names) {
    const { lastInsertRowid } = insertHobby.run(name);
    hobbyIds.set(name, Number(lastInsertRowid));
  }
});
insertHobbies(HOBBIES);

const insertUser = db.prepare<[string, string, number, string, string]>(
  "INSERT INTO users (first_name, last_name, age, nationality, avatar) VALUES (?, ?, ?, ?, ?)"
);
const insertUserHobby = db.prepare<[number, number]>(
  "INSERT INTO user_hobbies (user_id, hobby_id) VALUES (?, ?)"
);

const insertAll = db.transaction((count: number) => {
  for (let i = 0; i < count; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const age = faker.number.int({ min: 18, max: 75 });
    const nationality = faker.helpers.arrayElement(NATIONALITIES);
  
    const avatar = faker.helpers.arrayElement(AVATAR_PALETTE);

    const { lastInsertRowid } = insertUser.run(firstName, lastName, age, nationality, avatar);
    const userId = Number(lastInsertRowid);

    const hobbyCount = faker.number.int({ min: 0, max: 10 });
    const userHobbies = faker.helpers.arrayElements(HOBBIES, hobbyCount);
    for (const hobbyName of userHobbies) {
      insertUserHobby.run(userId, hobbyIds.get(hobbyName)!);
    }
  }
});
insertAll(USER_COUNT);

const { count: userCount } = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
const { count: linkCount } = db.prepare("SELECT COUNT(*) as count FROM user_hobbies").get() as { count: number };
console.log(`Done. ${userCount} users, ${HOBBIES.length} hobbies, ${linkCount} user–hobby links.`);
