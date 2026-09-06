/**
 * Maps a gallery photo to its grid thumbnail.
 *
 * Grids show photos at ~220px but were loading the full 1200x1600 original. Use
 * `thumb(src)` for the `src` and keep the original in `data-full` so the lightbox
 * still opens the full-resolution image.
 *
 * Thumbnails are produced by scripts/make-thumbs.mjs during the build, mirroring the
 * source path under /images/_thumbs/. Folders that script skips (tattoo-templates,
 * sertifikalar) are returned unchanged, so calling this on them is harmless.
 */
const SKIPPED = ['/images/tattoo-templates/', '/images/sertifikalar/', '/images/_thumbs/'];

export function thumb(src: string): string {
  if (!src.startsWith('/images/')) return src;
  if (SKIPPED.some((p) => src.startsWith(p))) return src;
  return src.replace('/images/', '/images/_thumbs/');
}
