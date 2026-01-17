import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { nanoid } from "nanoid";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId() {
  return nanoid(12);
}

export function extractVideoId(url: string): { platform: "youtube" | "vimeo" | null; id: string | null } {
  // YouTube patterns
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of youtubePatterns) {
    const match = url.match(pattern);
    if (match) {
      return { platform: "youtube", id: match[1] };
    }
  }

  // Vimeo patterns
  const vimeoPatterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ];

  for (const pattern of vimeoPatterns) {
    const match = url.match(pattern);
    if (match) {
      return { platform: "vimeo", id: match[1] };
    }
  }

  return { platform: null, id: null };
}

export function getEmbedUrl(url: string): string | null {
  const { platform, id } = extractVideoId(url);

  if (!platform || !id) return null;

  if (platform === "youtube") {
    return `https://www.youtube.com/embed/${id}`;
  }

  if (platform === "vimeo") {
    return `https://player.vimeo.com/video/${id}`;
  }

  return null;
}
