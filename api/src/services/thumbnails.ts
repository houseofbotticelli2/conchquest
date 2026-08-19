import sharp from 'sharp';
import { pool } from '../config/db';
import { getObjectBytes, putObject, thumbKeyFor } from './storage';

// One size, used for both the list row and the expanded card (docs/TODO.md
// #112). Sized for the card -- ~350pt at 3x -- rather than the row, because a
// thumbnail that is too small looks soft where it matters and merely wastes a
// few KB where it doesn't. Turns a ~2.9MB original into roughly 100-200KB.
const THUMB_MAX_EDGE = 1200;
const THUMB_QUALITY = 80;

/**
 * Builds a thumbnail for an already-uploaded photo and records it on the find.
 *
 * Deliberately swallows its own failures. Image processing sits on the path of
 * someone logging a find on a beach; a resize that throws must not lose their
 * find. On failure `thumb_key` stays null and every caller falls back to the
 * original, which is exactly the behaviour finds logged before thumbnails
 * existed already have.
 */
export async function generateThumbnail(findId: string, photoKey: string): Promise<void> {
  try {
    const original = await getObjectBytes(photoKey);

    const thumb = await sharp(original)
      // Must come before resize: a portrait photo carries its orientation in
      // EXIF, so resizing first would fit the target against swapped
      // dimensions and then rotate the result.
      .rotate()
      // `inside` keeps the aspect ratio and never enlarges a photo that is
      // already smaller than the target -- upscaling would cost bytes and
      // gain nothing.
      .resize({ width: THUMB_MAX_EDGE, height: THUMB_MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      // Always JPEG regardless of the source: HEIC in particular is not
      // renderable by every client, and thumbKeyFor() names the key .jpg.
      .jpeg({ quality: THUMB_QUALITY })
      .toBuffer();

    const key = thumbKeyFor(photoKey);
    await putObject(key, thumb, 'image/jpeg');
    await pool.query('UPDATE shell_finds SET thumb_key = $1 WHERE id = $2', [key, findId]);
  } catch (err) {
    console.error(`Thumbnail generation failed for find ${findId} (${photoKey}):`, err);
  }
}
