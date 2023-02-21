import * as cryptly from "cryptly"
import * as http from "cloudly-http"
import * as cloudRouter from "cloudly-router"
import * as transactly from "./index"

declare const cosmosUrl: string
declare const cosmosKey: string
declare const cosmosDatabase: string
declare const cosmosCollection: string

const router = new cloudRouter.Router()
const storage = transactly.Storage.connect<{ value: number }>(cosmosUrl, cosmosKey, cosmosDatabase, cosmosCollection)

async function create(request: http.Request): Promise<http.Response.Like | any> {
	const body = await request.body
	return await (await storage).put(cryptly.Identifier.generate(4), request.parameter.shard ?? "test", body)
}
router.add("POST", "/:shard", create)

async function list(request: http.Request): Promise<http.Response.Like | any> {
	return await (await storage).list(request.parameter.shard ?? "test")
}
router.add("GET", "/:shard", list)

async function fetch(request: http.Request): Promise<http.Response.Like | any> {
	const result = await (await storage).get(request.parameter.key ?? "test", request.parameter.shard ?? "test")
	return result ?? { status: 400 }
}
router.add("GET", "/:shard/:key", fetch)

async function replace(request: http.Request): Promise<http.Response.Like | any> {
	const body = await request.body
	return (
		(await (await storage).put(request.parameter.key ?? "test", request.parameter.shard ?? "test", body)) ?? {
			status: 400,
		}
	)
}
router.add("PUT", "/:shard/:key", replace)

async function modify(request: http.Request): Promise<http.Response.Like | any> {
	const body = await request.body
	const increment = Number.parseInt(body)
	return (
		(await (
			await storage
		).modify(request.parameter.key ?? "test", request.parameter.shard ?? "test", async value => ({
			value: value.value + increment,
		}))) ?? { status: 400 }
	)
}
router.add("PATCH", "/:shard/:key", modify)

async function remove(request: http.Request): Promise<http.Response.Like | any> {
	const result = await (await storage).delete(request.parameter.key ?? "test", request.parameter.shard ?? "test")
	return result ? { status: 202 } : { status: 400 }
}
router.add("DELETE", "/:shard/:key", remove)

addEventListener("fetch", (event: FetchEvent) => {
	event.respondWith(router.handle(http.Request.from(event.request), {}).then(http.Response.to))
})
