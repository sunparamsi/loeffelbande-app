import { isCloudConfigured } from './supabaseClient'
import { LocalRepository } from './localRepo'
import { SupabaseRepository } from './supabaseRepo'
import type { Repository } from './repo'

export const repo: Repository = isCloudConfigured ? new SupabaseRepository() : new LocalRepository()

export * from './repo'
export { getSharedRecipePublic } from './supabaseRepo'
