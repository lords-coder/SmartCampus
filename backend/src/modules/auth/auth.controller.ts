import { Request, Response } from "express";
import * as authService from "./auth.service";
import { sendSuccess } from "../../utils/response";
import { ApiError } from "../../utils/ApiError";

export async function register(req: Request, res: Response) {
  const result = await authService.register(req.body);
  return sendSuccess(res, result, "Account created successfully", 201);
}

export async function login(req: Request, res: Response) {
  const result = await authService.login(req.body);
  return sendSuccess(res, result, "Logged in successfully");
}

export async function me(req: Request, res: Response) {
  const user = req.user;
  if (!user) throw ApiError.unauthorized();
  const data = await authService.getCurrentUser(user.id);
  return sendSuccess(res, data, "Current session");
}

export async function logout(_req: Request, res: Response) {
  // JWTs are stateless: the client discards the token on receipt of this response.
  return sendSuccess(res, { loggedOut: true }, "Logged out successfully");
}
