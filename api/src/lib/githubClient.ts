import { Octokit } from '@octokit/rest'

export function getOctokit(token: string) {
  return new Octokit({ auth: token })
}

/** Parse owner/repo from a full GitHub URL or "owner/repo" shorthand */
export function parseRepo(repoUrlOrSlug: string): { owner: string; repo: string } {
  const slug = repoUrlOrSlug.replace('https://github.com/', '').replace(/\/$/, '')
  const [owner, repo] = slug.split('/')
  if (!owner || !repo) throw new Error(`Invalid repo: ${repoUrlOrSlug}`)
  return { owner, repo }
}

/** Get all file paths in a repo (recursive tree) */
export async function getRepoTree(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<string[]> {
  try {
    const { data } = await octokit.git.getTree({
      owner, repo, tree_sha: 'HEAD', recursive: '1'
    })
    return data.tree
      .filter(n => n.type === 'blob' && n.path)
      .map(n => n.path as string)
  } catch {
    return []
  }
}

/** Fetch a file from GitHub, returns decoded string or null */
export async function fetchFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  maxBytes = 8000
): Promise<string | null> {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path })
    if ('content' in data) {
      return Buffer.from(data.content as string, 'base64')
        .toString('utf8')
        .slice(0, maxBytes)
    }
    return null
  } catch {
    return null
  }
}

/** Create or update a file in a repo */
export async function upsertFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string
): Promise<void> {
  const encoded = Buffer.from(content).toString('base64')
  let sha: string | undefined

  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path })
    if ('sha' in data) sha = data.sha as string
  } catch {
    // New file
  }

  await octokit.repos.createOrUpdateFileContents({
    owner, repo, path, message, content: encoded, sha
  })
}
