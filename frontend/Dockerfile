FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json ./
COPY frontend/package.json ./frontend/
COPY frontend/ ./frontend/

RUN rm -rf package-lock.json node_modules frontend/node_modules
RUN npm install -w @jobqueue/frontend
RUN npm run build -w @jobqueue/frontend

FROM nginx:alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
