const DIRECT_VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mov|m4v|mkv)(\?|#|$)/i;

const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?(?:.*&)?v=)([a-zA-Z0-9_-]{6,})/i,
  /(?:youtu\.be\/)([a-zA-Z0-9_-]{6,})/i,
  /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{6,})/i,
  /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,})/i,
];

const VIMEO_PATTERNS = [/(?:vimeo\.com\/)(?:video\/)?(\d{6,})/i];

function matchFirst(url: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = pattern.exec(url);
    if (match?.[1]) return match[1];
  }
  return null;
}

/** File video trực tiếp (mp4/webm/...) thì dùng thẻ `<video>`, không nhúng. */
export function isDirectVideoUrl(url: string): boolean {
  return DIRECT_VIDEO_EXTENSIONS.test(url);
}

/**
 * Trả URL nhúng cho iframe (YouTube/Vimeo) hoặc `null` khi link không phải
 * nguồn nhúng — khi đó giao diện tự render `<video>` hoặc chỉ hiện link.
 */
export function getVideoEmbedUrl(url: string): string | null {
  const youtubeId = matchFirst(url, YOUTUBE_PATTERNS);
  if (youtubeId) return `https://www.youtube.com/embed/${youtubeId}`;

  const vimeoId = matchFirst(url, VIMEO_PATTERNS);
  if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}`;

  return null;
}
