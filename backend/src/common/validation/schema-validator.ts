/**
 * Minimal, best-effort validator for the JSON-Schema-like objects Nest's
 * SwaggerModule derives from `@ApiProperty`/`@ApiPropertyOptional`
 * decorators. It intentionally does not implement the full JSON Schema or
 * OpenAPI spec (no format/pattern/min/max checks) — the goal is to catch the
 * class of bug this feature exists for: a response missing a required field,
 * or shaped completely differently than its declared DTO.
 */

type SchemaObject = Record<string, any>;
type Components = { schemas?: Record<string, SchemaObject> } | undefined;

const MAX_DEPTH = 8;

function resolveSchema(
  schema: SchemaObject,
  components: Components,
): SchemaObject {
  if (schema.$ref && typeof schema.$ref === 'string') {
    const name = schema.$ref.split('/').pop() as string;
    const resolved = components?.schemas?.[name];
    return resolved ? resolveSchema(resolved, components) : schema;
  }

  if (Array.isArray(schema.allOf)) {
    return schema.allOf.reduce(
      (merged: SchemaObject, sub: SchemaObject) => {
        const resolvedSub = resolveSchema(sub, components);
        return {
          ...merged,
          ...resolvedSub,
          properties: { ...merged.properties, ...resolvedSub.properties },
          required: [
            ...(merged.required ?? []),
            ...(resolvedSub.required ?? []),
          ],
        };
      },
      { ...schema, allOf: undefined } as SchemaObject,
    );
  }

  return schema;
}

export function validateAgainstSchema(
  schema: SchemaObject,
  value: unknown,
  components: Components,
  path = '$',
  depth = 0,
): string[] {
  if (depth > MAX_DEPTH) {
    return [];
  }

  const resolved = resolveSchema(schema, components);
  const errors: string[] = [];

  if (value === undefined) {
    // Missing values are reported by the parent (via `required`), not here.
    return errors;
  }

  if (value === null) {
    const allowsNull =
      resolved.nullable === true ||
      (Array.isArray(resolved.oneOf) &&
        resolved.oneOf.some((s: SchemaObject) => s.type === 'null'));
    if (!allowsNull) {
      errors.push(`${path}: got null, schema does not mark this nullable`);
    }
    return errors;
  }

  if (Array.isArray(resolved.enum) && !resolved.enum.includes(value)) {
    errors.push(
      `${path}: value ${JSON.stringify(value)} is not one of the declared enum values`,
    );
  }

  switch (resolved.type) {
    case 'string':
      if (typeof value !== 'string') {
        errors.push(`${path}: expected string, got ${typeof value}`);
      }
      break;
    case 'number':
    case 'integer':
      if (typeof value !== 'number') {
        errors.push(`${path}: expected ${resolved.type}, got ${typeof value}`);
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') {
        errors.push(`${path}: expected boolean, got ${typeof value}`);
      }
      break;
    case 'array':
      if (!Array.isArray(value)) {
        errors.push(`${path}: expected array, got ${typeof value}`);
      } else if (resolved.items) {
        value.forEach((item, index) => {
          errors.push(
            ...validateAgainstSchema(
              resolved.items,
              item,
              components,
              `${path}[${index}]`,
              depth + 1,
            ),
          );
        });
      }
      break;
    case 'object':
    default:
      if (resolved.properties || resolved.required) {
        if (typeof value !== 'object' || Array.isArray(value)) {
          errors.push(`${path}: expected object, got ${typeof value}`);
          break;
        }

        for (const requiredKey of resolved.required ?? []) {
          if ((value as Record<string, unknown>)[requiredKey] === undefined) {
            errors.push(`${path}.${requiredKey}: required property is missing`);
          }
        }

        for (const [key, propSchema] of Object.entries<SchemaObject>(
          resolved.properties ?? {},
        )) {
          const propValue = (value as Record<string, unknown>)[key];
          if (propValue === undefined) {
            continue;
          }
          errors.push(
            ...validateAgainstSchema(
              propSchema,
              propValue,
              components,
              `${path}.${key}`,
              depth + 1,
            ),
          );
        }
      }
      break;
  }

  return errors;
}
