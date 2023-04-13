FROM node:18

COPY . /app

WORKDIR /app

EXPOSE 4000

RUN npm install

RUN npm uninstall sqlite3

RUN npm install sqlite3

CMD ["npm", "start"]