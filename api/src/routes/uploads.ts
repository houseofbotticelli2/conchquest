import { Router } from 'express';
import { createUploadUrl, isAllowedImageContentType } from '../services/storage';

export const uploadsRouter = Router();

uploadsRouter.post('/presign', async (req, res, next) => {
  try {
    const { contentType } = req.body ?? {};

    if (typeof contentType !== 'string' || !isAllowedImageContentType(contentType)) {
      res.status(400).json({ error: 'contentType must be one of: image/jpeg, image/png, image/heic, image/webp' });
      return;
    }

    const { uploadUrl, key } = await createUploadUrl(req.user!.id, contentType);
    res.json({ uploadUrl, key });
  } catch (err) {
    next(err);
  }
});
