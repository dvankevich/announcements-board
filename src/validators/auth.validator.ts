import { z } from "zod";
import { registry } from "../openapi.ts";

export const RegisterSchema = registry.register(
  "Register",
  z.object({
    username: z
      .string()
      .regex(/^[a-zA-Z0-9_]+$/)
      .min(3)
      .max(30)
      .openapi({ example: "user01" }),
    email: z.email().openapi({ example: "user01@example.com" }),
    password: z.string().min(8).openapi({ example: "securepass123" }),
    name: z.string().min(1).max(100).openapi({ example: "FirstName LastName" }),
  }),
);

export const LoginSchema = registry.register(
  "Login",
  z.object({
    username: z.string().openapi({ example: "user01" }),
    password: z.string().openapi({ example: "securepass123" }),
  }),
);

export type RegisterBody = z.infer<typeof RegisterSchema>;
export type LoginBody = z.infer<typeof LoginSchema>;

registry.registerPath({
  method: "post",
  path: "/api/auth/register",
  tags: ["Auth"],
  summary: "Register a new user",
  request: {
    body: {
      content: {
        "application/json": { schema: RegisterSchema },
      },
    },
  },
  responses: {
    201: { description: "User registered successfully" },
    409: { description: "Username or email already taken" },
    422: { description: "Validation error" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/login",
  tags: ["Auth"],
  summary: "Login user",
  request: {
    body: {
      content: {
        "application/json": { schema: LoginSchema },
      },
    },
  },
  responses: {
    200: { description: "Login successful" },
    401: { description: "Invalid credentials" },
    422: { description: "Validation error" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/refresh",
  tags: ["Auth"],
  summary: "Refresh token pair",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            refreshToken: z.string().optional().openapi({
              example: "b7a5d9c8a296022d69b264168629b27e7fa55ffe883d7b4653c9425fd1f3667b317637810c06ec7e",
            }),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: "Tokens refreshed successfully" },
    401: { description: "Invalid or expired refresh token" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/logout",
  tags: ["Auth"],
  summary: "Logout user",
  responses: {
    204: { description: "Logged out successfully" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/auth/me",
  tags: ["Auth"],
  summary: "Get current user profile",
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "Current user profile" },
    401: { description: "Authentication required" },
  },
});
