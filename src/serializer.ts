import {
	Inject,
	Injectable,
	SetMetadata,
	StreamableFile,
} from "@nestjs/common";
import { map } from "rxjs";

import { createZodSerializationException } from "./exception";
import { validate } from "./validate";

import type { ZodDto } from "./dto";
import type {
	CallHandler,
	ExecutionContext,
	NestInterceptor,
} from "@nestjs/common";
import type { Observable } from "rxjs";
import type { ZodSchema } from "zod";

// NOTE (external)
// We need to deduplicate them here due to the circular dependency
// between core and common packages
const REFLECTOR = "Reflector";

export const ZodSerializerDtoOptions = "ZOD_SERIALIZER_DTO_OPTIONS" as const;

export const ZodSerializerDto = (dto: ZodDto | ZodSchema) =>
	SetMetadata(ZodSerializerDtoOptions, dto);

@Injectable()
export class ZodSerializerInterceptor implements NestInterceptor {
	public constructor(@Inject(REFLECTOR) protected readonly reflector: any) {}

	public intercept(
		context: ExecutionContext,
		next: CallHandler
	): Observable<any> {
		const responseSchema = this.getContextResponseSchema(context);

		return next.handle().pipe(
			map((res: object | object[]) => {
				if (!responseSchema) return res;
				if (typeof res !== "object" || res instanceof StreamableFile)
					return res;

				return Array.isArray(res)
					? res.map((item) =>
							validate(item, responseSchema, createZodSerializationException)
						)
					: validate(res, responseSchema, createZodSerializationException);
			})
		);
	}

	protected getContextResponseSchema(
		context: ExecutionContext
	): ZodDto | ZodSchema | undefined {
		return this.reflector.getAllAndOverride(ZodSerializerDtoOptions, [
			context.getHandler(),
			context.getClass(),
		]);
	}
}
