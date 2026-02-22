import ApiError from '../utils/ApiError.js';

const formatZodIssues = (issues) =>
  issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));

export const validate = (schemaConfig) => (req, res, next) => {
  if (!schemaConfig) {
    return next(new ApiError(500, 'VALIDATION_SCHEMA_MISSING', 'Validation schema is not provided.'));
  }

  const targets =
    typeof schemaConfig.safeParse === 'function'
      ? [{ key: 'body', schema: schemaConfig }]
      : ['body', 'query', 'params']
          .filter((key) => schemaConfig[key])
          .map((key) => ({ key, schema: schemaConfig[key] }));

  if (targets.length === 0) {
    return next(new ApiError(500, 'VALIDATION_SCHEMA_MISSING', 'Validation schema is not provided.'));
  }

  const details = [];

  for (const target of targets) {
    const result = target.schema.safeParse(req[target.key]);

    if (!result.success) {
      details.push({
        field: target.key,
        errors: formatZodIssues(result.error.issues),
      });
      continue;
    }

    req[target.key] = result.data;
  }

  if (details.length > 0) {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'Validation failed', details));
  }

  return next();
};
