const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "access-control-allow-headers": "content-type",
};

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...JSON_HEADERS,
      ...init.headers,
    },
  });
}

export function error(status, message, details = null) {
  return json(
    {
      error: {
        message,
        details,
      },
    },
    { status }
  );
}

export function notFound() {
  return error(404, "Not found");
}

export function preflight() {
  return new Response(null, {
    status: 204,
    headers: JSON_HEADERS,
  });
}
