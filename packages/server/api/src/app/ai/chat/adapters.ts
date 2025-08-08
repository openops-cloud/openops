/**
 * Adapts JSON schemas for GPT-5 model compatibility by fixing validation issues.
 *
 * GPT-5 has stricter schema validation requirements compared to other models:
 * - Requires 'additionalProperties: false' for object schemas with empty properties
 * - Validates that 'required' array includes all non-optional properties
 * - Enforces consistent schema structure in nested anyOf/oneOf/allOf constructs
 *
 * This adapter:
 * 1. Removes optional properties (properties not listed in 'required' array)
 * 2. Sets 'additionalProperties: false' for empty object schemas
 * 3. Recursively processes nested schemas (anyOf, oneOf, allOf, items)
 * 4. Ensures schema consistency across all levels
 *
 * @param schema - The original JSON schema to adapt
 * @returns Adapted schema compatible with GPT-5 validation requirements
 */
export function gpt5SchemaAdapter(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  const fixedSchema = { ...schema };

  if (fixedSchema.properties) {
    const properties = fixedSchema.properties as Record<string, unknown>;
    const requiredFields = (fixedSchema.required as string[]) || [];
    const filteredProperties: Record<string, unknown> = {};

    // Only keep properties that are listed in the required array
    for (const [key, property] of Object.entries(properties)) {
      if (requiredFields.includes(key)) {
        // Recursively fix nested properties
        filteredProperties[key] = gpt5SchemaAdapter(
          property as Record<string, unknown>,
        );
      }
    }

    fixedSchema.properties = filteredProperties;
  }

  const isObjectSchema =
    fixedSchema.type === 'object' ||
    fixedSchema.properties !== undefined ||
    (!fixedSchema.type && typeof fixedSchema === 'object');

  if (isObjectSchema) {
    const hasNoProperties =
      !fixedSchema.properties ||
      Object.keys(fixedSchema.properties as Record<string, unknown>).length ===
        0;

    if (hasNoProperties || fixedSchema.additionalProperties === undefined) {
      fixedSchema.additionalProperties = false;
    }
  }

  if (fixedSchema.anyOf && Array.isArray(fixedSchema.anyOf)) {
    fixedSchema.anyOf = (fixedSchema.anyOf as Record<string, unknown>[]).map(
      gpt5SchemaAdapter,
    );
  }
  if (fixedSchema.oneOf && Array.isArray(fixedSchema.oneOf)) {
    fixedSchema.oneOf = (fixedSchema.oneOf as Record<string, unknown>[]).map(
      gpt5SchemaAdapter,
    );
  }
  if (fixedSchema.allOf && Array.isArray(fixedSchema.allOf)) {
    fixedSchema.allOf = (fixedSchema.allOf as Record<string, unknown>[]).map(
      gpt5SchemaAdapter,
    );
  }

  // Handle items for arrays
  if (fixedSchema.items) {
    fixedSchema.items = gpt5SchemaAdapter(
      fixedSchema.items as Record<string, unknown>,
    );
  }

  return fixedSchema;
}
