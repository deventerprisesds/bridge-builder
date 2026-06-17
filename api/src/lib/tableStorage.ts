import { TableClient } from '@azure/data-tables'
import { decrypt } from './crypto'

const conn = process.env.AZURE_STORAGE_CONNECTION_STRING!

export function getTable(tableName: string) {
  return TableClient.fromConnectionString(conn, tableName)
}

export async function getUserKeys(subjectId: string) {
  try {
    const client = getTable('BridgeUserKeys')
    const entity = await client.getEntity('keys', subjectId)
    return {
      openAiKey:   entity.OpenAiKeyEncrypted   ? decrypt(entity.OpenAiKeyEncrypted as string)   : '',
      githubToken: entity.GithubTokenEncrypted ? decrypt(entity.GithubTokenEncrypted as string) : '',
      figmaToken:  entity.FigmaTokenEncrypted  ? decrypt(entity.FigmaTokenEncrypted as string)  : ''
    }
  } catch {
    return { openAiKey: '', githubToken: '', figmaToken: '' }
  }
}

export async function listEntitiesForUser<T>(
  tableName: string,
  subjectId: string
): Promise<T[]> {
  const client = getTable(tableName)
  const results: T[] = []
  for await (const entity of client.listEntities({
    queryOptions: { filter: `PartitionKey eq '${subjectId}'` }
  })) {
    results.push(entity as T)
  }
  return results
}

/** Ensure required tables exist (called at cold start) */
export async function ensureTables() {
  for (const name of ['BridgeApps', 'BridgeBuildJobs', 'BridgeUserKeys']) {
    try {
      await TableClient.fromConnectionString(conn, name).createTable()
    } catch {
      // Table already exists — ignore
    }
  }
}
