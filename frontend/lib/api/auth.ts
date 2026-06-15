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
