const request = require("supertest");
const app = require("../index");

describe("video streaming microservice", () => {
  test("microservice can handle requests", async () => {
    const response = await request(app).get("/live");
    expect(response.status).toBe(200);
  });
});
