FROM node:18-alpine

WORKDIR /app

# copy dependency backend
COPY backend/package*.json ./

RUN npm install --production

# copy seluruh source backend
COPY backend/ .

EXPOSE 8080

CMD ["node", "server.js"]
