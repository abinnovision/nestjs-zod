import { Injectable, UseGuards } from "@nestjs/common";

import { validate } from "./validate";

import type { ZodDto } from "./dto";
import type { ZodExceptionCreator } from "./exception";
import type { Source } from "./shared/types";
import type { ZodSchema } from "./z";
import type { CanActivate, ExecutionContext } from "@nestjs/common";

interface ZodBodyGuardOptions {
	createValidationException?: ZodExceptionCreator;
}

type ZodGuardClass = new (
	source: Source,
	schemaOrDto: ZodSchema | ZodDto
) => CanActivate;

export function createZodGuard({
	createValidationException,
}: ZodBodyGuardOptions = {}): ZodGuardClass {
	@Injectable()
	class ZodGuard {
		public constructor(
			private source: Source,
			private schemaOrDto: ZodSchema | ZodDto
		) {}

		public canActivate(context: ExecutionContext) {
			const data = context.switchToHttp().getRequest()[this.source];

			validate(data, this.schemaOrDto, createValidationException);

			return true;
		}
	}

	return ZodGuard;
}

export const ZodGuard = createZodGuard();

export const UseZodGuard = (source: Source, schemaOrDto: ZodSchema | ZodDto) =>
	UseGuards(new ZodGuard(source, schemaOrDto));
