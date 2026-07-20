import { Router } from 'express';
import { createUploadUrl, isAllowedImageContentType } from '../services/storage';

export const uploadsRouter = Router();

uploadsRouter.post('/presign', async (req, res, next) => {
  try {
    const { contentType, purpose } = req.body ?? {};

    if (typeof contentType !== 'string' || !isAllowedImageContentType(contentType)) {
      res.status(400).json({ error: 'contentType must be one of: image/jpeg, image/png, image/heic, image/webp' });
      return;
    }
    if (purpose !== undefined && purpose !== 'find' && purpose !== 'avatar') {
      res.status(400).json({ error: 'purpose must be "find" or "avatar"' });
      return;
    }

    const { uploadUrl, key } = await createUploadUrl(req.user!.id, contentType, purpose);
    res.json({ uploadUrl, key });
  } catch (err) {
    next(err);
  }
});
