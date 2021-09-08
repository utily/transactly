import { check } from "./checkDate"

describe("Check Date tests", () => {
	it("Check Date tests", () => {
		expect(check("2020-01-01", "2020-01-01")).toEqual({
			start: "2020-01-01T00:00:00.000Z",
			end: "2020-01-01T23:59:59.999Z",
		})
		expect(check("2020-01-01T12:35", "2020-01-01")).toEqual({
			start: "2020-01-01T12:35:00.000Z",
			end: "2020-01-01T23:59:59.999Z",
		})
		expect(check("2020-01-01T12:35", "2020-01-01T12:45:67.8")).toEqual({
			start: "2020-01-01T12:35:00.000Z",
			end: "2020-01-01T12:45:67.899Z",
		})
		expect(check("2020-01-01T12:35", "2020-01-01T12:45:67.888ZNO")).toEqual({
			start: "2020-01-01T12:35:00.000Z",
			end: undefined,
		})
	})
})
