FROM node:8-alpine

COPY . /workspace
WORKDIR /workspace
RUN npm install
RUN npm install request
RUN npm install rabbit.js

EXPOSE 3000

CMD npm start
