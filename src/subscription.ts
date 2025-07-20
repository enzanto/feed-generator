import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'
import { Database } from './db'

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  private allowedDids: Set<string>

  constructor(db: Database, subscriptionEndpoint: string, allowedDids: Set<string>) {
    super(db, subscriptionEndpoint)
    this.allowedDids = allowedDids
  }

  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return

    const ops = await getOpsByType(evt)

    // This logs the text of every post off the firehose.
    // Just for fun :)
    // Delete before actually using
    // for (const post of ops.posts.creates) {
    //   console.log(post.record.text)
    // }

    const postsToDelete = ops.posts.deletes.map((del) => del.uri)
    const postsToCreate = ops.posts.creates
      .filter((create) => {
		const author = create.author
        const text = create.record?.text?.toLowerCase?.() || ''
        return this.allowedDids.has(author)
        // only alf-related posts
        // return create.record.text.toLowerCase().includes('alf')
      })
      .map((create) => {
        console.log(`🟢 Including post from allowed DID: ${create.author}`)
        // map alf-related posts to a db row
        return {
          uri: create.uri,
          cid: create.cid,
          indexedAt: new Date().toISOString(),
        }
      })

    if (postsToDelete.length > 0) {
      await this.db
        .deleteFrom('post')
        .where('uri', 'in', postsToDelete)
        .execute()
    }
    if (postsToCreate.length > 0) {
      console.log(`💾 Inserting ${postsToCreate.length} post(s):`, postsToCreate)
      await this.db
        .insertInto('post')
        .values(postsToCreate)
        .onConflict((oc) => oc.doNothing())
        .execute()
    }
  }
}
