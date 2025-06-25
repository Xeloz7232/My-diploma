FROM node:20.17.0

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
       libreoffice-writer \
       libreoffice-core \
       fonts-liberation \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "start"]
