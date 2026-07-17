# Etapa 1: Build da aplicação Vite
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

ARG VITE_API_PROVIDER
ARG VITE_NEST_API_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_API_PROVIDER=$VITE_API_PROVIDER
ENV VITE_NEST_API_URL=$VITE_NEST_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY

COPY . .
RUN npm run build

# Etapa 2: Servir os arquivos estáticos
FROM nginx:alpine

# Copia os arquivos de build do Vite (geralmente na pasta dist) para o Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia a configuração do Nginx que inclui o proxy para o PostgREST
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
