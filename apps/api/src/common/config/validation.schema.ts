import * as Joi from "joi";

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  PORT: Joi.number().integer().default(3001),
  FRONTEND_URL: Joi.string().uri().required(),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
  CLERK_SECRET_KEY: Joi.string().required(), // SERVER-SIDE ONLY — never expose to frontend
  CLERK_JWKS_URL: Joi.string().uri().optional().allow(""), // auto-derived from CLERK_SECRET_KEY; override only for private networks
  CLERK_ISSUER: Joi.string().optional().allow(""), // for multi-domain JWT validation
  CLERK_AUDIENCE: Joi.string().optional().allow(""), // for audience-restricted JWT validation
});
