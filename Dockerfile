# --- Base image for dependencies and build ---
FROM node:18 AS base
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --frozen-lockfile || npm install

# --- Development image ---
FROM base AS dev
WORKDIR /app
COPY . .
ENV NODE_ENV=development
EXPOSE 5173
CMD ["npm", "run", "dev"]


