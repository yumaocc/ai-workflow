<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project Media Generation Rule

When this project needs any generated image, cover image, poster, social post illustration, product visual, campaign visual, or image asset, use the local Codex `gpt-image-2` skill/workflow strictly.

- Do not use random online images, placeholder stock images, SVG illustrations, or another image model as a substitute.
- Follow the `gpt-image-2` skill mode check before generating or preparing image prompts.
- If the current runtime cannot directly generate the image, produce and save a `gpt-image-2` prompt according to the skill workflow instead of pretending an image was generated.
