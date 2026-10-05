import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

const app = createApp();

describe("GET /api/health", () => {
  it("returns 200 ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("GET /api/users", () => {
  it("returns the expected shape with default paging", async () => {
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 1, pageSize: 60, hasMore: true });
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.users).toHaveLength(60);
  
    const user = res.body.users[0];
    expect(user).toHaveProperty("id");
    expect(user).toHaveProperty("avatar");
    expect(user).toHaveProperty("first_name");
    expect(user).toHaveProperty("last_name");
    expect(user).toHaveProperty("age");
    expect(user).toHaveProperty("nationality");
    expect(Array.isArray(user.hobbies)).toBe(true);
  });

  it("rejects an invalid sort field with 400, not a 500 or silent fallback", async () => {
    const res = await request(app).get("/api/users?sort=middle_name");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid query parameters");
  });

  it("rejects a pageSize over the cap with 400", async () => {
    const res = await request(app).get("/api/users?pageSize=9999");
    expect(res.status).toBe(400);
  });

  it("an explicit pageSize overrides the default of 60", async () => {
    const res = await request(app).get("/api/users?pageSize=10");
    expect(res.status).toBe(200);
    expect(res.body.pageSize).toBe(10);
    expect(res.body.users).toHaveLength(10);
  });

  it("still allows up to 100 per page, the cap", async () => {
    const res = await request(app).get("/api/users?pageSize=100");
    expect(res.status).toBe(200);
    expect(res.body.pageSize).toBe(100);
    expect(res.body.users).toHaveLength(100);
  });

  it("applies search + nationality + hobby filters together over real HTTP query parsing", async () => {
    const res = await request(app).get(
      "/api/users?search=an&nationality=Brazil&nationality=Japan&hobby=Hiking"
    );
    expect(res.status).toBe(200);
    for (const user of res.body.users) {
      expect(["Brazil", "Japan"]).toContain(user.nationality);
      expect(user.hobbies).toContain("Hiking");
      const nameMatches =
        user.first_name.toLowerCase().includes("an") || user.last_name.toLowerCase().includes("an");
      expect(nameMatches).toBe(true);
    }
  });
});

describe("filter edge cases over HTTP", () => {
  it("duplicate or differently-cased hobby params return the same users as one value, not zero", async () => {
    const single = await request(app).get("/api/users?hobby=Hiking");
    const repeated = await request(app).get("/api/users?hobby=Hiking&hobby=Hiking&hobby=hiking");
    expect(repeated.status).toBe(200);
    expect(single.body.total).toBeGreaterThan(0);
    expect(repeated.body.total).toBe(single.body.total);
  });

  it("blank filter params mean 'no filter' — same total as an unfiltered request", async () => {
    const unfiltered = await request(app).get("/api/users");
    const blank = await request(app).get("/api/users?hobby=&nationality=");
    expect(blank.status).toBe(200);
    expect(blank.body.total).toBe(unfiltered.body.total);
  });

  it("searching a person's full name returns them, not zero", async () => {
    const first = (await request(app).get("/api/users")).body.users[0];
    const fullName = `${first.first_name} ${first.last_name}`;
    const res = await request(app).get(`/api/users?search=${encodeURIComponent(fullName)}`);
    expect(res.status).toBe(200);
    expect(res.body.users.map((u: { id: number }) => u.id)).toContain(first.id);
  });

  it("the nationality facet still lists other nationalities after one is selected", async () => {
    const res = await request(app).get("/api/nationalities/top?nationality=Brazil&nationality=Japan");
    expect(res.status).toBe(200);
    const values = res.body.nationalities.map((n: { value: string }) => n.value);
    expect(values).toContain("Brazil");
    expect(values).toContain("Japan");
    expect(values.length).toBeGreaterThan(2);
    expect(values.length).toBeLessThanOrEqual(20);
  });
});

describe("GET /api/hobbies/top", () => {
  it("returns a hobbies array of at most 20 { value, count } entries", async () => {
    const res = await request(app).get("/api/hobbies/top");
    expect(res.status).toBe(200);
    expect(res.body.hobbies.length).toBeLessThanOrEqual(20);
    expect(res.body.hobbies[0]).toHaveProperty("value");
    expect(res.body.hobbies[0]).toHaveProperty("count");
  });
});

describe("GET /api/nationalities/top", () => {
  it("returns a nationalities array of at most 20 { value, count } entries", async () => {
    const res = await request(app).get("/api/nationalities/top");
    expect(res.status).toBe(200);
    expect(res.body.nationalities.length).toBeLessThanOrEqual(20);
    expect(res.body.nationalities[0]).toHaveProperty("value");
    expect(res.body.nationalities[0]).toHaveProperty("count");
  });
});

describe("unknown routes", () => {
  it("returns a 404 JSON body, not Express's default HTML error page", async () => {
    const res = await request(app).get("/api/nonexistent");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Not found" });
  });
});
