import {
	INVALID,
	ParseStatus,
	ZodIssueCode,
	ZodParsedType,
	ZodType,
} from "zod";

import { addIssueToContext } from "../issues";
import {
	findCheck,
	normalizeErrorMessage,
	processCreateParams,
} from "../shared";
import { ZodFirstPartyTypeKindExtended } from "../type-names";

import type {
	DateStringDayType,
	DateStringDirection,
	DateStringFormat,
} from "../issues";
import type { ErrorMessage, RawCreateParams } from "../shared";
import type { ParseInput, ParseReturnType, ZodTypeDef } from "zod";

type ZodIsoDateCheck =
	| {
			kind: "format";
			value: DateStringFormat;
			regex: RegExp;
			message?: string;
	  }
	| { kind: "direction"; direction: DateStringDirection; message?: string }
	| { kind: "day-type"; type: DateStringDayType; message?: string }
	| { kind: "minYear"; value: number; message?: string }
	| { kind: "maxYear"; value: number; message?: string };

const formatToRegex: Record<DateStringFormat, RegExp> = {
	date: /^\d{4}-\d{2}-\d{2}$/,
	"date-time":
		/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(|\.\d{3})(Z|[+-]\d{2}:\d{2})$/,
};

export interface ZodDateStringDef extends ZodTypeDef {
	checks: ZodIsoDateCheck[];
	typeName: ZodFirstPartyTypeKindExtended.ZodDateString;
}

export class ZodDateString extends ZodType<string, ZodDateStringDef> {
	public static create = (params?: RawCreateParams): ZodDateString => {
		return new ZodDateString({
			checks: [
				{
					kind: "format",
					value: "date-time",
					regex: formatToRegex["date-time"],
				},
			],
			typeName: ZodFirstPartyTypeKindExtended.ZodDateString,
			...processCreateParams(params),
		});
	};

	public _parse(input: ParseInput): ParseReturnType<string> {
		const parsedType = this._getType(input);
		const context = this._getOrReturnCtx(input);

		if (parsedType !== ZodParsedType.string) {
			addIssueToContext(context, {
				code: ZodIssueCode.invalid_type,
				expected: ZodParsedType.string,
				received: context.parsedType,
			});

			return INVALID;
		}

		const date = new Date(input.data);

		if (Number.isNaN(date.getTime())) {
			addIssueToContext(context, {
				code: ZodIssueCode.custom,
				// TODO: add message
				message: "Invalid date string",
				params: {
					isNestJsZod: true,
					code: "invalid_date_string",
				},
			});

			return INVALID;
		}

		const status = new ParseStatus();

		for (const check of this._def.checks) {
			if (check.kind === "format") {
				const valid = check.regex.test(input.data);
				if (valid) continue;

				addIssueToContext(context, {
					code: ZodIssueCode.custom,
					message: check.message,
					params: {
						isNestJsZod: true,
						code: "invalid_date_string_format",
						expected: check.value,
					},
				});

				status.dirty();
			} else if (check.kind === "direction") {
				const conditions: Record<DateStringDirection, boolean> = {
					past: date < new Date(),
					future: date > new Date(),
				};

				const valid = conditions[check.direction];
				if (valid) continue;

				addIssueToContext(context, {
					code: ZodIssueCode.custom,
					message: check.message,
					params: {
						isNestJsZod: true,
						code: "invalid_date_string_direction",
						expected: check.direction,
					},
				});

				status.dirty();
			} else if (check.kind === "day-type") {
				const day = date.getDay();

				const conditions: Record<DateStringDayType, boolean> = {
					weekDay: day !== 0 && day !== 6,
					weekend: day === 0 || day === 6,
				};
				const valid = conditions[check.type];
				if (valid) continue;

				addIssueToContext(context, {
					code: ZodIssueCode.custom,
					message: check.message,
					params: {
						isNestJsZod: true,
						code: "invalid_date_string_day",
						expected: check.type,
					},
				});

				status.dirty();
			} else if (check.kind === "minYear") {
				const valid = date.getFullYear() >= check.value;
				if (valid) continue;

				addIssueToContext(context, {
					code: ZodIssueCode.too_small,
					type: "date_string_year",
					minimum: check.value,
					inclusive: true,
					message: check.message,
				});

				status.dirty();
			} else if (check.kind === "maxYear") {
				const valid = date.getFullYear() <= check.value;
				if (valid) continue;

				addIssueToContext(context, {
					code: ZodIssueCode.too_big,
					type: "date_string_year",
					maximum: check.value,
					inclusive: true,
					message: check.message,
				});

				status.dirty();
			}
		}

		return { status: status.value, value: input.data };
	}

	public _replaceCheck(check: ZodIsoDateCheck) {
		return new ZodDateString({
			...this._def,
			checks: this._def.checks
				.filter((item) => item.kind !== check.kind)
				.concat(check),
		});
	}

	public format(format: DateStringFormat, message?: ErrorMessage) {
		return this._replaceCheck({
			kind: "format",
			value: format,
			regex: formatToRegex[format],
			...normalizeErrorMessage(message),
		});
	}

	public past(message?: ErrorMessage) {
		return this._replaceCheck({
			kind: "direction",
			direction: "past",
			...normalizeErrorMessage(message),
		});
	}

	public future(message?: ErrorMessage) {
		return this._replaceCheck({
			kind: "direction",
			direction: "future",
			...normalizeErrorMessage(message),
		});
	}

	public weekDay(message?: ErrorMessage) {
		return this._replaceCheck({
			kind: "day-type",
			type: "weekDay",
			...normalizeErrorMessage(message),
		});
	}

	public weekend(message?: ErrorMessage) {
		return this._replaceCheck({
			kind: "day-type",
			type: "weekend",
			...normalizeErrorMessage(message),
		});
	}

	public minYear(year: number, message?: ErrorMessage) {
		return this._replaceCheck({
			kind: "minYear",
			value: year,
			...normalizeErrorMessage(message),
		});
	}

	public maxYear(year: number, message?: ErrorMessage) {
		return this._replaceCheck({
			kind: "maxYear",
			value: year,
			...normalizeErrorMessage(message),
		});
	}

	public cast() {
		return this.transform((string) => new Date(string));
	}

	public get format_() {
		return findCheck(this._def.checks, "format");
	}

	public get isPast() {
		return findCheck(this._def.checks, "direction")?.direction === "past";
	}

	public get isFuture() {
		return findCheck(this._def.checks, "direction")?.direction === "future";
	}

	public get isWeekDay() {
		return findCheck(this._def.checks, "day-type")?.type === "weekDay";
	}

	public get isWeekend() {
		return findCheck(this._def.checks, "day-type")?.type === "weekend";
	}

	public get minYear_() {
		return findCheck(this._def.checks, "minYear");
	}

	public get maxYear_() {
		return findCheck(this._def.checks, "maxYear");
	}
}

export const dateString = ZodDateString.create;
