FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
# `npm install` (not `ci`): lock may omit optional Linux deps when generated on Windows.
RUN npm install

COPY . .

EXPOSE 8082

# --host: reachable from host / other containers
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8082"]
