FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

RUN mkdir -p public/images

EXPOSE 8081

CMD ["node", "index.js"]