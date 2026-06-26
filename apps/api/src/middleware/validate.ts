import type { ZodSchema, ZodError } from "zod";

// Generic validator — call this at the top of any route
export function validateBody<T>(
  schema: ZodSchema<T>,
  body: unknown,
):
  | { success: true; data: T }
  | {
      success: false;
      error: { code: string; message: string; details: unknown };
    } {
  const result = schema.safeParse(body);

  if (!result.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: formatZodError(result.error),
      },
    };
  }

  return { success: true, data: result.data };
}

export function validateQuery<T>(
  schema: ZodSchema<T>,
  query: unknown,
):
  | { success: true; data: T }
  | {
      success: false;
      error: { code: string; message: string; details: unknown };
    } {
  return validateBody(schema, query);
}

// Format Zod errors into human-readable field errors
function formatZodError(error: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const field = issue.path.join(".") || "root";
    if (!fieldErrors[field]) fieldErrors[field] = [];
    fieldErrors[field]!.push(issue.message);
  }

  return fieldErrors;
}
