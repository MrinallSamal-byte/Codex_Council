type ParsedGithubRepositoryUrl = {
  owner: string;
  repo: string;
  ref: string | null;
  canonicalUrl: string;
};

type GithubRepositoryMetadata = {
  name: string;
  defaultBranch: string;
  htmlUrl: string;
};

const GITHUB_HOSTS = new Set(["github.com", "www.github.com"]);

function githubHeaders() {
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "RepoCouncil",
  };
}

export function parseGithubRepositoryUrl(rawUrl: string): ParsedGithubRepositoryUrl {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Enter a valid public GitHub repository URL.");
  }

  if (!GITHUB_HOSTS.has(url.hostname)) {
    throw new Error("Only public GitHub repository URLs are supported.");
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    throw new Error("Use a repository URL like https://github.com/owner/repo.");
  }

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/i, "");

  if (!owner || !repo) {
    throw new Error("Use a repository URL like https://github.com/owner/repo.");
  }

  if (segments.length > 2 && segments[2] !== "tree") {
    throw new Error("Use the repository root URL or a branch URL ending in /tree/<branch>.");
  }

  const ref = segments[2] === "tree" ? decodeURIComponent(segments.slice(3).join("/")) : null;

  return {
    owner,
    repo,
    ref: ref || null,
    canonicalUrl: `https://github.com/${owner}/${repo}`,
  };
}

export async function fetchGithubRepositoryMetadata(
  owner: string,
  repo: string,
): Promise<GithubRepositoryMetadata> {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: githubHeaders(),
  });

  if (response.status === 404) {
    throw new Error("Repository not found. Make sure the GitHub repository is public.");
  }

  if (!response.ok) {
    throw new Error(`GitHub metadata lookup failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    name?: string;
    default_branch?: string;
    html_url?: string;
  };

  if (!payload.name || !payload.default_branch || !payload.html_url) {
    throw new Error("GitHub returned incomplete repository metadata.");
  }

  return {
    name: payload.name,
    defaultBranch: payload.default_branch,
    htmlUrl: payload.html_url,
  };
}

export async function downloadGithubRepositoryArchive(params: {
  owner: string;
  repo: string;
  ref?: string | null;
}) {
  const archivePath = params.ref
    ? `https://api.github.com/repos/${params.owner}/${params.repo}/zipball/${encodeURIComponent(params.ref)}`
    : `https://api.github.com/repos/${params.owner}/${params.repo}/zipball`;
  const response = await fetch(archivePath, {
    headers: githubHeaders(),
    redirect: "follow",
  });

  if (response.status === 404) {
    throw new Error("Unable to download that repository archive from GitHub.");
  }

  if (!response.ok) {
    throw new Error(`GitHub archive download failed with status ${response.status}.`);
  }

  return response.arrayBuffer();
}
