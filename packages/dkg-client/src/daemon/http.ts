type HttpError = Error & {
  httpStatus?: number;
  responseBody?: unknown;
};

function httpError(status: number, message: string, body?: unknown): HttpError {
  const err = new Error(message) as HttpError;
  err.httpStatus = status;
  err.responseBody = body;
  return err;
}

function errorMessageFromBody(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") {
    return fallback;
  }
  const record = body as Record<string, unknown>;
  if (typeof record.error === "string") {
    return record.error;
  }
  if (typeof record.message === "string") {
    return record.message;
  }
  return fallback;
}

export async function daemonRequest<T>(
  baseUrl: string,
  token: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  } catch {
    throw new Error(
      'DKG daemon is not reachable. Try again later.'
    );
  }

  const body = await response.json().catch(() => ({
    error: response.statusText,
  }));

  if (!response.ok) {
    throw httpError(
      response.status,
      errorMessageFromBody(body, response.statusText),
      body
    );
  }

  return body as T;
}
