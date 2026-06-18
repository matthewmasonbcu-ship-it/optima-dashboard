type TradierEnv = "sandbox" | "production";

type TradierRequestOptions = {
  path: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: URLSearchParams;
};

function getTradierBaseUrl() {
  const env = (process.env.TRADIER_ENV || "sandbox").toLowerCase() as TradierEnv;

  if (env === "production") {
    return "https://api.tradier.com/v1";
  }

  return "https://sandbox.tradier.com/v1";
}

export async function tradierRequest({ path, method = "GET", body }: TradierRequestOptions) {
  const env = (process.env.TRADIER_ENV || "sandbox").toLowerCase() as TradierEnv;
  const token =
    env === "production"
      ? process.env.TRADIER_PRODUCTION_TOKEN
      : process.env.TRADIER_ACCESS_TOKEN;

  if (!token) {
    return {
      ok: false,
      status: 500,
      data: {
        success: false,
        error:
          env === "production"
            ? "Missing TRADIER_PRODUCTION_TOKEN in .env.local."
            : "Missing TRADIER_ACCESS_TOKEN in .env.local.",
      },
    };
  }

  const baseUrl = getTradierBaseUrl();
  console.log(`[tradierClient] env=${env} baseUrl=${baseUrl} path=${path}`);
  const url = `${baseUrl}${path}`;

  const response = await fetch(url, {
    method,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body,
  });

  const text = await response.text();

  let data: unknown;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}