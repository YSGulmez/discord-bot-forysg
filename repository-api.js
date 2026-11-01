const cacheDurationMs = 15 * 60 * 1000;

function toRepositorySummary(repository) {
  return {
    id: repository.id,
    name: repository.name,
    description: repository.description,
    html_url: repository.html_url,
    language: repository.language,
    fork: repository.fork,
    private: repository.private,
    topics: repository.topics,
    updated_at: repository.updated_at,
    stargazers_count: repository.stargazers_count,
  };
}

function createRepositoriesHandler({
  env = process.env,
  fetchImpl = globalThis.fetch,
  logger = console,
  now = Date.now,
} = {}) {
  let repositories;
  let cachedAt = 0;
  let refreshPromise;

  async function refreshRepositories() {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
      const token = env.GITHUB_TOKEN;
      if (!token) throw new Error("GITHUB_TOKEN is not configured.");

      const latestRepositories = [];
      let page = 1;
      while (true) {
        const githubUrl = new URL("https://api.github.com/user/repos");
        githubUrl.searchParams.set("visibility", "all");
        githubUrl.searchParams.set("affiliation", "owner");
        githubUrl.searchParams.set("sort", "updated");
        githubUrl.searchParams.set("per_page", "100");
        githubUrl.searchParams.set("page", String(page));

        const response = await fetchImpl(githubUrl, {
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "portfolio-repository-api",
          },
        });
        if (!response.ok) throw new Error(`GitHub returned ${response.status}.`);

        const pageRepositories = await response.json();
        if (!Array.isArray(pageRepositories)) throw new Error("GitHub returned an unexpected repository list.");

        latestRepositories.push(...pageRepositories.map(toRepositorySummary));
        if (pageRepositories.length < 100) break;
        page += 1;
      }

      repositories = latestRepositories;
      cachedAt = now();
      return repositories;
    })();

    try {
      return await refreshPromise;
    } catch (error) {
      logger.error("GitHub repository refresh failed:", error);
      throw error;
    } finally {
      refreshPromise = undefined;
    }
  }

  return async function handleRepositories(request, response) {
    const page = Number(request.query.page || 1);
    const perPage = Number(request.query.per_page || 100);
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isInteger(perPage) || perPage < 1 || perPage > 100) {
      response.set("Cache-Control", "no-store");
      return response.status(400).json({ error: "Invalid repository pagination parameters." });
    }

    if (!env.GITHUB_TOKEN) {
      response.set("Cache-Control", "no-store");
      return response.status(503).json({ error: "Repository service is not configured." });
    }

    try {
      let repositoryList = repositories;
      if (!repositoryList || now() - cachedAt >= cacheDurationMs) {
        try {
          repositoryList = await refreshRepositories();
        } catch (error) {
          if (!repositoryList) throw error;
        }
      }
      response.set("Cache-Control", "no-store");
      return response.json(repositoryList.slice((page - 1) * perPage, page * perPage));
    } catch {
      response.set("Cache-Control", "no-store");
      return response.status(503).json({ error: "Repository data is temporarily unavailable." });
    }
  };
}

module.exports = { createRepositoriesHandler };
