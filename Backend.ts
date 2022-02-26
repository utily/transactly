import * as cryptly from "cryptly"
import * as isoly from "isoly"
import * as cosmos from "@cfworker/cosmos"
import { check } from "./checkDate"
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
	async list(
		document: { shard: string },
		start?: isoly.Date | isoly.DateTime,
		end?: isoly.Date | isoly.DateTime,
		limit?: number,
		continuation?: string
	): Promise<{ data: Document<T>[]; continuation?: string } | undefined> {
		;({ start, end } = check(start, end))
		const result: Document<T>[] = []
		let response: cosmos.FeedResponse<Document<T> & cosmos.Document> | undefined
		const parameters = [
			...(start ? [{ name: "@start", value: start, operator: ">=" }] : []),
			...(end ? [{ name: "@end", value: end, operator: "<=" }] : []),
		]
		const query = `SELECT * FROM ROOT a ${
			parameters.length
				? `WHERE ${parameters.map(c => `a["value"]["created"] ${c.operator} ${c.name}`).join(" AND ")} `
				: ""
		}ORDER BY a["value"]["created"] DESC`
		do {
			response = response?.hasNext
				? await response?.next()
				: await this.client.queryDocuments<Document<T> & cosmos.Document>({
						partitionKey: document.shard,
						maxItems: limit ?? -1,
						continuation,
						query,
						parameters,
				  })
			result.push(
				...(await response.json())?.map(r => {
					return {
						key: r.id,
						shard: r.shard,
						value: r.value,
						lock: r.lock,
						eTag: JSON.parse(r?._etag),
					}
				})
			)
		} while (response.hasNext && !limit && !continuation)
		const continuationToken = response.headers.get("x-ms-continuation") || undefined
		return result.length == 0 && continuation ? undefined : { data: result, continuation: continuationToken }
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
