FROM node:8-alpine

WORKDIR /workdir
ADD . /workdir

EXPOSE 8181
EXPOSE 9239
EXPOSE 8191
RUN npm install

WORKDIR /workdir
CMD ["node", "index.js"]
