export function useAttachmentUrl(att) {
  const url = att?.localUrl ?? att?.url ?? null;
  return { url, status: url ? "ready" : "error" };
}
