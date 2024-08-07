import { Injectable } from "@nestjs/common";

import { isZodDto } from "./dto";
import { validate } from "./validate";

import type { ZodDto } from "./dto";
import type { ZodExceptionCreator } from "./exception";
import type { ZodSchema } from "./z";
import type { ArgumentMetadata, PipeTransform } from "@nestjs/common";

interface ZodValidationPipeOptions {
	createValidationException?: ZodExceptionCreator;
}

type ZodValidationPipeClass = new (
	schemaOrDto?: ZodSchema | ZodDto
) => PipeTransform;

export function createZodValidationPipe({
	createValidationException,
}: ZodValidationPipeOptions = {}): ZodValidationPipeClass {
	@Injectable()
	class ZodValidationPipe implements PipeTransform {
		public constructor(private schemaOrDto?: ZodSchema | ZodDto) {}

		public transform(value: unknown, metadata: ArgumentMetadata) {
			if (this.schemaOrDto) {
				return validate(value, this.schemaOrDto, createValidationException);
			}

			const { metatype } = metadata;

			if (!isZodDto(metatype)) {
				return value;
			}

			return validate(value, metatype.schema, createValidationException);
		}
	}

	return ZodValidationPipe;
}

export const ZodValidationPipe = createZodValidationPipe();
