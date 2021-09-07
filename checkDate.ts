import * as isoly from "isoly"

export function check(
	start?: isoly.Date | isoly.DateTime,
	end?: isoly.Date | isoly.DateTime
): { start: isoly.DateTime | undefined; end: isoly.DateTime | undefined } {
	start = fix("T00:00:00.000Z", start)
	end = fix("T23:59:59.999Z", end)
	return { start, end }
}
export function fix(
	suffix: "T00:00:00.000Z" | "T23:59:59.999Z",
	date?: isoly.Date | isoly.DateTime
): isoly.DateTime | undefined {
	return typeof date == "string" && (isoly.DateTime.is(date) || isoly.Date.is(date)) && date.length <= 24
		? date + suffix.substring(Math.min(Math.max(date.length - 10, 0)), 14)
		: undefined
}
