FROM node:20.17.0

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 4000

CMD ["npm", "start"]
