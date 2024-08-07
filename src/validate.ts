import { isZodDto } from "./dto";
import { createZodValidationException } from "./exception";

import type { ZodDto } from "./dto";
import type { ZodExceptionCreator } from "./exception";
import type { ZodSchema, ZodTypeDef } from "zod";

export function validate<
	TOutput = any,
	TDef extends ZodTypeDef = ZodTypeDef,
	TInput = TOutput,
>(
	value: unknown,
	schemaOrDto: ZodSchema<TOutput, TDef, TInput> | ZodDto<TOutput, TDef, TInput>,
	createValidationException: ZodExceptionCreator = createZodValidationException
) {
	const schema = isZodDto(schemaOrDto) ? schemaOrDto.schema : schemaOrDto;

	const result = schema.safeParse(value);

	if (!result.success) {
		throw createValidationException(result.error);
	}

	return result.data;
}
