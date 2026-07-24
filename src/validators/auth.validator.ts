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
