export function useDocUrl(doc) {
  return { url: doc.url ?? null };
}

export const downloadUrl = (doc) => (doc.kind === "link" ? doc.url : `${doc.url}?download=1`);
