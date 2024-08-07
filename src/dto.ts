import type { ZodSchema, ZodTypeDef } from "./z";

export interface ZodDto<
	TOutput = any,
	TDef extends ZodTypeDef = ZodTypeDef,
	TInput = TOutput,
> {
	isZodDto: true;
	schema: ZodSchema<TOutput, TDef, TInput>;
	create: (input: unknown) => TOutput;
	new (): TOutput;
}

export function createZodDto<
	TOutput = any,
	TDef extends ZodTypeDef = ZodTypeDef,
	TInput = TOutput,
>(schema: ZodSchema<TOutput, TDef, TInput>) {
	class AugmentedZodDto {
		public static isZodDto = true;
		public static schema = schema;

		public static create(input: unknown) {
			return this.schema.parse(input);
		}
	}

	return AugmentedZodDto as unknown as ZodDto<TOutput, TDef, TInput>;
}

export function isZodDto(metatype: any): metatype is ZodDto<unknown> {
	return metatype?.isZodDto;
}
