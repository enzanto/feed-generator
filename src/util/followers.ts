
import { BskyAgent } from '@atproto/api'

const agent = new BskyAgent({ service: 'https://bsky.social' })

const IDENTIFIER = process.env.BSKY_IDENTIFIER!
const PASSWORD = process.env.BSKY_PASSWORD!

export async function getAllFollowers(targetDid: string): Promise<Set<string>> {
  await agent.login({ identifier: IDENTIFIER, password: PASSWORD })

  const followers = new Set<string>()
  let cursor: string | undefined = undefined

  do {
    const res = await agent.app.bsky.graph.getFollowers({
      actor: targetDid,
      limit: 100,
      cursor,
    })

    for (const follower of res.data.followers) {
      followers.add(follower.did)
    }

    cursor = res.data.cursor
  } while (cursor)

  return followers
}
