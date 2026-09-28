FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts
COPY index.html client.js sprites.js creature.js interface.js qr.js QR-LICENSE.txt command.css style.css server.mjs game.mjs campaign.mjs ./
COPY assets ./assets
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
USER node
CMD ["node", "server.mjs"]

