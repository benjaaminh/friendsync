import { prisma } from "./prisma";

interface RefreshResult {
  access_token: string;
  error?: undefined;
}

interface RefreshError {
  access_token?: undefined;
  error: string;
}

export async function refreshAccessToken(account: {
  id: string;
  refresh_token: string | null;
}): Promise<RefreshResult | RefreshError> {
  if (!account.refresh_token) {
    return { error: "No refresh token available" };
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: account.refresh_token,
      }),
    });

    const tokens = await response.json();

    if (!response.ok) {
      return { error: tokens.error || "Token refresh failed" };
    }

    await prisma.account.update({
      where: { id: account.id },
      data: {
        access_token: tokens.access_token,
        expires_at: Math.floor(Date.now() / 1000 + tokens.expires_in),
        ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
      },
    });

    return { access_token: tokens.access_token };
  } catch {
    return { error: "Token refresh request failed" };
  }
}
