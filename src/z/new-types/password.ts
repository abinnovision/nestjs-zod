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
	hasCheck,
	normalizeErrorMessage,
	processCreateParams,
} from "../shared";
import { ZodFirstPartyTypeKindExtended } from "../type-names";

import type { ErrorMessage, RawCreateParams } from "../shared";
import type { ParseInput, ParseReturnType, ZodTypeDef } from "zod";

type SymbolKind = "digit" | "lowercase" | "uppercase" | "special";

interface ZodPasswordSymbolCheck {
	kind: SymbolKind;
	message?: string;
}

type ZodPasswordCheck =
	| ZodPasswordSymbolCheck
	| { kind: "minLength"; value: number; message?: string }
	| { kind: "maxLength"; value: number; message?: string };

const SYMBOL_KINDS: SymbolKind[] = [
	"digit",
	"lowercase",
	"uppercase",
	"special",
];

const REGEXPS: Record<SymbolKind, RegExp> = {
	digit: /\d/,
	lowercase: /[a-z]/,
	uppercase: /[A-Z]/,
	special: /[!?@#$%^&*{};.,:%№"|\\/()\-_+=<>`~[\]'"]/,
};

function isSymbolCheck(
	check: ZodPasswordCheck
): check is ZodPasswordSymbolCheck {
	return SYMBOL_KINDS.includes(check.kind as any);
}

export interface ZodPasswordDef extends ZodTypeDef {
	checks: ZodPasswordCheck[];

	typeName: ZodFirstPartyTypeKindExtended.ZodPassword;
}

export class ZodPassword extends ZodType<string, ZodPasswordDef> {
	public static create = (params?: RawCreateParams): ZodPassword => {
		return new ZodPassword({
			checks: [],
			typeName: ZodFirstPartyTypeKindExtended.ZodPassword,
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

		const status = new ParseStatus();

		for (const check of this._def.checks) {
			if (isSymbolCheck(check)) {
				const valid = REGEXPS[check.kind].test(input.data);
				if (valid) continue;

				addIssueToContext(context, {
					code: ZodIssueCode.custom,
					message: check.message,
					params: {
						isNestJsZod: true,
						code: `invalid_password_no_${check.kind}`,
					},
				});

				status.dirty();
			} else if (check.kind === "minLength") {
				const valid = input.data.length >= check.value;
				if (valid) continue;

				addIssueToContext(context, {
					code: ZodIssueCode.too_small,
					type: "password",
					minimum: check.value,
					inclusive: true,
					message: check.message,
				});

				status.dirty();
			} else if (check.kind === "maxLength") {
				const valid = input.data.length <= check.value;
				if (valid) continue;

				addIssueToContext(context, {
					code: ZodIssueCode.too_big,
					type: "password",
					maximum: check.value,
					inclusive: true,
					message: check.message,
				});

				status.dirty();
			}
		}

		return { status: status.value, value: input.data };
	}

	public _replaceCheck(check: ZodPasswordCheck) {
		return new ZodPassword({
			...this._def,
			checks: this._def.checks
				.filter((item) => item.kind !== check.kind)
				.concat(check),
		});
	}

	public buildFullRegExp(): RegExp {
		const lookaheads: string[] = [];

		for (const check of this._def.checks) {
			if (!isSymbolCheck(check)) continue;
			const regex = REGEXPS[check.kind];
			lookaheads.push(`(?=.*${regex.source})`);
		}

		if (lookaheads.length === 0) {
			return /^.*$/;
		}

		const union = lookaheads.join("");
		return new RegExp(`^(?:${union}.*)$`);
	}

	public atLeastOne(kind: SymbolKind, message?: ErrorMessage) {
		return this._replaceCheck({
			kind,
			...normalizeErrorMessage(message),
		});
	}

	public min(length: number, message?: ErrorMessage) {
		return this._replaceCheck({
			kind: "minLength",
			value: length,
			...normalizeErrorMessage(message),
		});
	}

	public max(length: number, message?: ErrorMessage) {
		return this._replaceCheck({
			kind: "maxLength",
			value: length,
			...normalizeErrorMessage(message),
		});
	}

	public isAtLeastOne(kind: SymbolKind) {
		return hasCheck(this._def.checks, kind);
	}

	public get minLength() {
		return findCheck(this._def.checks, "minLength");
	}

	public get maxLength() {
		return findCheck(this._def.checks, "maxLength");
	}
}

export const password = ZodPassword.create;
