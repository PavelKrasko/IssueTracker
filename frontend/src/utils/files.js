export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
export const IMAGE_ACCEPT = IMAGE_TYPES.join(",");
export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_ATTACHMENTS = 10;

export function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} МБ`;
}

export function validateImages(files, alreadyAttached = 0) {
  const valid = [];
  const errors = [];
  for (const file of files) {
    if (!IMAGE_TYPES.includes(file.type)) {
      errors.push(`«${file.name}» — не изображение. Подходят PNG, JPG, GIF и WebP.`);
    } else if (file.size > MAX_FILE_SIZE) {
      errors.push(`«${file.name}» весит ${formatBytes(file.size)}. Максимум — ${formatBytes(MAX_FILE_SIZE)}.`);
    } else if (alreadyAttached + valid.length >= MAX_ATTACHMENTS) {
      errors.push(`К задаче можно прикрепить не больше ${MAX_ATTACHMENTS} изображений.`);
      break;
    } else {
      valid.push(file);
    }
  }
  return { valid, errors };
}

export function nameForPasted(file) {
  if (file.name && file.name !== "image.png") return file;
  const ext = file.type.split("/")[1] ?? "png";
  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  return new File([file], `screenshot-${stamp}.${ext}`, { type: file.type });
}
