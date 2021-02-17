import * as cryptly from "cryptly"
import * as http from "cloud-http"
import * as cloudRouter from "cloud-router"
import * as transactly from "./index"

declare const cosmosUrl: string
declare const cosmosKey: string
declare const cosmosDatabase: string
declare const cosmosCollection: string

const router = new cloudRouter.Router()
const storage = transactly.Storage.connect<{ value: number }>(cosmosUrl, cosmosKey, cosmosDatabase, cosmosCollection)

async function create(request: http.Request): Promise<http.Response.Like | any> {
	const body = await request.body
	return await (await storage).put(cryptly.Identifier.generate(4), request.parameter.shard, body)
}
router.add("POST", "/:shard", create)

async function fetch(request: http.Request): Promise<http.Response.Like | any> {
	const result = await (await storage).get(request.parameter.key, request.parameter.shard)
	return result ?? { status: 400 }
}
router.add("GET", "/:shard/:key", fetch)

async function replace(request: http.Request): Promise<http.Response.Like | any> {
	const body = await request.body
	return (await (await storage).put(request.parameter.key, request.parameter.shard, body)) ?? { status: 400 }
}
router.add("PUT", "/:shard/:key", replace)

async function modify(request: http.Request): Promise<http.Response.Like | any> {
	const body = await request.body
	const increment = Number.parseInt(body)
	return (
		(await (await storage).modify(request.parameter.key, request.parameter.shard, async value => ({
			value: value.value + increment,
		}))) ?? { status: 400 }
	)
}
router.add("PATCH", "/:shard/:key", modify)

async function remove(request: http.Request): Promise<http.Response.Like | any> {
	const result = await (await storage).delete(request.parameter.key, request.parameter.shard)
	return result ? { status: 202 } : { status: 400 }
}
router.add("DELETE", "/:shard/:key", remove)

addEventListener("fetch", event => {
	event.respondWith(router.handle(http.Request.from(event.request)).then(http.Response.to))
})
