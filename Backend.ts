import * as cryptly from "cryptly"
import * as cosmos from "@cfworker/cosmos"
import { Document } from "./Document"

export class Backend<T> {
	constructor(private client: cosmos.CosmosClient) {}
	async get(document: { key: cryptly.Identifier; shard: string }): Promise<Document<T> | undefined> {
		return this.fromResponse(
			await this.client.getDocument<Document<T> & cosmos.Document>({
				docId: document.key,
				partitionKey: document.shard,
			})
		)
	}
	async create(document: { key: cryptly.Identifier; shard: string; value: T; lock?: string }) {
		const response = await this.client.createDocument<Document<T> & cosmos.Document>({
			partitionKey: document.shard,
			document: {
				id: document.key,
				shard: document.shard,
				value: document.value,
				lock: document.lock,
			} as cosmos.Resource,
		})
		return this.fromResponse(response)
	}
	async set(document: {
		key: cryptly.Identifier
		shard: string
		value: T
		lock?: string
	}): Promise<Document<T> | undefined> {
		return this.fromResponse(
			await this.client.createDocument<Document<T> & cosmos.Document>({
				partitionKey: document.shard,
				document: {
					id: document.key,
					shard: document.shard,
					value: document.value,
					lock: document.lock,
				} as cosmos.Resource,
				isUpsert: true,
			})
		)
	}
	async list(document: { shard: string }): Promise<Document<T>[] | undefined> {
		const result: Document<T>[] = []
		let response: cosmos.FeedResponse<Document<T> & cosmos.Document> | undefined
		do {
			response = response?.hasNext
				? await response?.next()
				: await this.client.getDocuments<Document<T> & cosmos.Document>({ partitionKey: document.shard })
			result.push(
				...(await response.json()).map(r => {
					return {
						key: r.id,
						shard: r.shard,
						value: r.value,
						lock: r.lock,
						eTag: JSON.parse(r?._etag),
					}
				})
			)
		} while (response.hasNext)
		return result
	}
	async replace(document: Document<T>): Promise<Document<T> | undefined> {
		return this.fromResponse(
			await this.client.replaceDocument<Document<T> & cosmos.Document>({
				docId: document.key,
				partitionKey: document.shard,
				document: {
					id: document.key,
					shard: document.shard,
					value: document.value,
					lock: document.lock,
				} as cosmos.Resource,
				ifMatch: document.eTag,
			})
		)
	}
	async delete(document: { key: cryptly.Identifier; shard: string; eTag?: string }): Promise<boolean> {
		const response = await this.client.deleteDocument({
			docId: document.key,
			partitionKey: document.shard,
			ifMatch: document.eTag,
		})
		return response.ok
	}
	private async fromResponse(
		response: cosmos.ItemResponse<Document<T> & cosmos.Document>
	): Promise<Document<T> | undefined> {
		if (response.status >= 400)
			console.log("Transactly Error", response, await response.json())
		const result = response.status < 400 ? await response.json() : undefined
		return (
			result && {
				key: result.id,
				shard: result.shard,
				value: result.value,
				lock: result.lock,
				eTag: JSON.parse(result?._etag),
			}
		)
	}
	static async connect<T>(url: string, secret: string, database: string, collection: string): Promise<Backend<T>> {
		const client = new cosmos.CosmosClient({
			endpoint: url,
			masterKey: secret,
			consistencyLevel: "Eventual",
			dbId: database,
			collId: collection,
		})
		return new Backend<T>(client)
	}
}
