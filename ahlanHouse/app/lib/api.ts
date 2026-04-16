/**
 * Central API base URL. Set NEXT_PUBLIC_API_URL in .env (no trailing slash).
 * For local dev use: https://127.0.0.1:8000/api/v1
 */
export const getApiBaseUrl = (): string => {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }
  return "https://api.ahlan.uz/api/v1";
};

/** Root URL for media and login (no /api/v1). Use for /media/ and /login/ at backend root. */
export const getApiRoot = (): string => {
  const base = getApiBaseUrl();
  return base.replace(/\/api\/v1\/?$/, "") || base;
};

/** 401: tokenni tozalash va login sahifasiga yo‘naltirish. */
export function clearAuthAndRedirect(router: { push: (path: string) => void }): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user_type");
  localStorage.removeItem("user_fio");
  localStorage.removeItem("userId");
  localStorage.removeItem("sales_module");
  router.push("/login");
}

/** Type-safe xato xabari (catch (error: unknown) uchun). */
export function getErrorMessage(error: unknown, fallback = "Noma'lum xatolik"): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error && typeof (error as { message: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return fallback;
}
