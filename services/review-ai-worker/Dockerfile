# Patch-pinned tag; operators should additionally pin a reviewed manifest digest.
FROM node:24.19.0-bookworm-slim

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --chown=node:node src ./src
RUN mkdir -p /app/models /app/.cache && chown -R node:node /app/models /app/.cache
ENV PORT=3100 \
    AI_MODEL_ROOT=/app/models \
    TRANSFORMERS_CACHE=/app/.cache
USER node
EXPOSE 3100
CMD ["node", "src/server.js"]
