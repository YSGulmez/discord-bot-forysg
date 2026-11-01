
# Render API

The Express service also provides `GET /api/repos?page=1&per_page=100` for the portfolio. Add `GITHUB_TOKEN` to the Render service's secret environment variables and redeploy. Use a fine-grained GitHub token restricted to the repositories you want to display, with repository metadata read permission.

This endpoint returns private repository names and metadata without authentication, so anyone can view them. Keep the token only in Render; never send it to the browser or add it to the Cloudflare Worker.
