FROM node:latest

COPY . /src

WORKDIR /src

RUN npm install --production

ENV PORT 3000
ENV NODE_ENV production
EXPOSE 3000

CMD npm start