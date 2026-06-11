FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

ENV PORT=3100
ENV TRANSFORMERS_CACHE=/app/.cache

EXPOSE 3100

CMD ["npm", "start"]
