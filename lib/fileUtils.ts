export async function fetchFileAsBase64(
  url: string,
): Promise<{ base64: string; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch file: HTTP ${res.status}`);
  }

  const mimeType = res.headers.get('content-type') || 'application/octet-stream';
  const ab = await res.arrayBuffer();
  const base64 = Buffer.from(new Uint8Array(ab)).toString('base64');
  return { base64, mimeType };
}

