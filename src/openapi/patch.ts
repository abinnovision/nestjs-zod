import { zodToOpenAPI } from "./zod-to-openapi";
import { isZodDto } from "../dto";

import type { Type } from "@nestjs/common";
import type { SchemaObjectFactory as SchemaObjectFactoryClass } from "@nestjs/swagger/dist/services/schema-object-factory";

/* eslint-disable no-param-reassign */

function getSchemaObjectFactory(): Type<SchemaObjectFactoryClass> {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	return require("@nestjs/swagger/dist/services/schema-object-factory")
		.SchemaObjectFactory;
}

export function patchNestJsSwagger(
	SchemaObjectFactory = getSchemaObjectFactory()
) {
	if (SchemaObjectFactory.prototype.__patchedWithLoveByNestjsZod) return;
	const defaultExplore = SchemaObjectFactory.prototype.exploreModelSchema;

	// eslint-disable-next-line func-name-matching
	const extendedExplore: SchemaObjectFactoryClass["exploreModelSchema"] =
		// eslint-disable-next-line max-params
		function exploreModelSchema(
			this: SchemaObjectFactoryClass | undefined,
			type,
			schemas,
			schemaRefsStack
		) {
			if (this && this["isLazyTypeFunc"](type)) {
				const factory = type as () => Type<unknown>;
				type = factory();
			}

			if (!isZodDto(type)) {
				return defaultExplore.call(this, type, schemas, schemaRefsStack);
			}

			schemas[type.name] = zodToOpenAPI(type.schema);
			return type.name;
		};

	SchemaObjectFactory.prototype.exploreModelSchema = extendedExplore;
	SchemaObjectFactory.prototype.__patchedWithLoveByNestjsZod = true;
}
