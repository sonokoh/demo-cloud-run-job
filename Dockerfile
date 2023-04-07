FROM node:18-alpine

COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
ENTRYPOINT ["node", "src/index.js"]