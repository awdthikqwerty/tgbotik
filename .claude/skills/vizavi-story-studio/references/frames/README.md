# Style-analysis frames

Place image frames, sheets, or other style reference stills in this folder. Every visual-style analysis must begin with `npm run references`, read the generated `production/reference-index.json`, and visually inspect every indexed `references/frames/` image. Use the images as style evidence (composition, palette, lighting, texture, depth, and motion cues); do not copy their protected characters or shots.

Supported image formats: PNG, JPG/JPEG, WebP, AVIF. Subfolders are scanned recursively. This folder may be empty; an empty folder is reported as zero references and must not block production.
