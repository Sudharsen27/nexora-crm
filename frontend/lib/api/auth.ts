import { apiFetch } from "@/lib/api/client";
import { clearTokens, setTokens } from "@/lib/auth/tokens";
import type { AuthResponse, TokenResponse, User } from "@/types/api";

export async function registerUser(data: {
  email: string;
  password: string;
  full_name: string;
}): Promise<AuthResponse> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"}/auth/register`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    const body = await response.json();
    throw new Error(typeof body.detail === "string" ? body.detail : "Registration failed");
  }

  const auth = (await response.json()) as AuthResponse;
  setTokens(auth.access_token);
  return auth;
}

export async function loginUser(data: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"}/auth/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    const body = await response.json();
    throw new Error(typeof body.detail === "string" ? body.detail : "Login failed");
  }

  const auth = (await response.json()) as AuthResponse;
  setTokens(auth.access_token);
  return auth;
}

export async function logoutUser(): Promise<void> {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } finally {
    clearTokens();
  }
}

export async function getCurrentUser(): Promise<User> {
  return apiFetch<User>("/auth/me");
}

export async function refreshSession(): Promise<TokenResponse | null> {
  const refreshToken =
    typeof window !== "undefined" ? localStorage.getItem("nexora_refresh_token") : null;
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"}/auth/refresh`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(refreshToken ? { refresh_token: refreshToken } : {}),
    },
  );
  if (!response.ok) return null;
  const data = (await response.json()) as TokenResponse;
  setTokens(data.access_token);
  return data;
}

function parseErrorMessage(body: unknown, fallback: string): string {
  if (typeof body === "object" && body !== null && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0];
      if (typeof first === "object" && first !== null && "msg" in first) {
        return String((first as { msg: unknown }).msg);
      }
    }
  }
  return fallback;
}

const authBase = () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export async function requestPasswordReset(email: string): Promise<{
  message: string;
  reset_url?: string | null;
  email_sent?: boolean;
  email_configured?: boolean;
}> {
  const response = await fetch(`${authBase()}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(parseErrorMessage(body, "Request failed"));
  }
  return body as {
    message: string;
    reset_url?: string | null;
    email_sent?: boolean;
    email_configured?: boolean;
  };
}

export async function resetPassword(data: {
  token: string;
  password: string;
}): Promise<{ message: string }> {
  const response = await fetch(`${authBase()}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(parseErrorMessage(body, "Reset failed"));
  }
  return body as { message: string };
}
