# Compila el frontend Angular y lo sirve con Nginx.

FROM node:20-alpine AS compilacion
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build:ec2

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=compilacion /app/dist/horarios-frontend/browser /usr/share/nginx/html
EXPOSE 80
