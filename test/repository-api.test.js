const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { createRepositoriesHandler } = require("../repository-api");

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: undefined,
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function repo(id, isPrivate = false) {
  return {
    id,
    name: `repo-${id}`,
    description: null,
    html_url: `https://github.com/YSGulmez/repo-${id}`,
    language: "JavaScript",
    fork: false,
    private: isPrivate,
    topics: [],
    updated_at: "2026-01-01T00:00:00Z",
    stargazers_count: 0,
    clone_url: "https://github.com/owner/repo.git",
  };
}

describe("repository API", () => {
  it("returns public and private repository summaries using the server token", async () => {
    let requestCount = 0;
    const handler = createRepositoriesHandler({
      env: { GITHUB_TOKEN: "server-secret" },
      fetchImpl: async (input, init) => {
        const url = new URL(String(input));
        assert.equal(url.pathname, "/user/repos");
        assert.equal(url.searchParams.get("visibility"), "all");
        assert.equal(url.searchParams.get("affiliation"), "owner");
        assert.equal(new Headers(init.headers).get("Authorization"), "Bearer server-secret");
        requestCount += 1;
        return Response.json(url.searchParams.get("page") === "1"
          ? Array.from({ length: 100 }, (_, index) => repo(index + 1, index === 0))
          : [repo(101, true)]);
      },
    });
    const response = createResponse();

    await handler({ query: {} }, response);
    const secondPage = createResponse();
    await handler({ query: { page: "2" } }, secondPage);

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["Cache-Control"], "no-store");
    assert.equal(response.body.length, 100);
    assert.equal(response.body[0].private, true);
    assert.deepEqual(secondPage.body.map(({ name, private: isPrivate }) => [name, isPrivate]), [
      ["repo-101", true],
    ]);
    assert.equal("clone_url" in response.body[0], false);
    assert.equal(requestCount, 2);
  });

  it("caches repository data and rejects invalid pagination", async () => {
    let requestCount = 0;
    const handler = createRepositoriesHandler({
      env: { GITHUB_TOKEN: "server-secret" },
      fetchImpl: async () => {
        requestCount += 1;
        return Response.json([repo(1)]);
      },
    });
    const firstResponse = createResponse();
    const secondResponse = createResponse();

    await handler({ query: {} }, firstResponse);
    await handler({ query: { per_page: "101" } }, secondResponse);

    assert.equal(firstResponse.body.length, 1);
    assert.equal(secondResponse.statusCode, 400);
    assert.equal(requestCount, 1);
  });

  it("requires a token rather than returning an incomplete repository list", async () => {
    const handler = createRepositoriesHandler({ env: {} });
    const response = createResponse();

    await handler({ query: {} }, response);

    assert.equal(response.statusCode, 503);
    assert.deepEqual(response.body, { error: "Repository service is not configured." });
  });
});
