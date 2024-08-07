import { addIssueToContext } from "zod";

import type { ZodAnyDateStringIssue } from "./date-string";
import type { ZodTooBigIssue, ZodTooSmallIssue } from "./overrided";
import type { ZodAnyPasswordIssue } from "./password";
import type { IssueData, ParseContext, ZodIssueOptionalMessage } from "zod";

declare type StripPath<T extends object> = T extends any
	? Omit<T, "path">
	: never;

type ZodIssueOptionalMessageExtended =
	| ZodIssueOptionalMessage
	| NestJsZodIssue
	| ZodTooSmallIssue
	| ZodTooBigIssue;

type ZodIssueExtended = ZodIssueOptionalMessageExtended & { message: string };

// for some reason "type" field breaks when using default Omit
type IssueDataExtended = StripPath<ZodIssueOptionalMessageExtended> & {
	path?: (string | number)[];
	fatal?: boolean;
};

function addIssueToContextExtended(
	context: ParseContext,
	issueData: IssueDataExtended
) {
	addIssueToContext(context, issueData as IssueData);
}

export type NestJsZodIssue = ZodAnyDateStringIssue | ZodAnyPasswordIssue;

export { addIssueToContextExtended as addIssueToContext };
export type { ZodIssueOptionalMessageExtended as ZodIssueOptionalMessage };
export type { ZodIssueExtended as ZodIssue };

export * from "./date-string";
export * from "./overrided";
export * from "./password";
