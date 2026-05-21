# Deploy VPS Hostinger

Guia para publicar o NovaCena Motion em uma VPS Hostinger com Node.js, PM2 e Nginx.

## Arquitetura

- A VPS roda o app Next.js.
- O domínio aponta para o IP público da VPS.
- O Nginx recebe HTTPS/HTTP e encaminha para o app na porta `3000`.
- O PM2 mantém o processo Node ativo.
- Renders pesados devem ir para AWS Remotion Lambda. O render local continua disponível como fallback.

## 1. Apontar domínio

No DNS do domínio ou subdomínio:

```txt
Tipo: A
Nome: app ou @
Valor: IP_PUBLICO_DA_VPS
TTL: automático ou 300
```

Exemplos:

- `app.seudominio.com.br`
- `motion.seudominio.com.br`
- `novacena.seudominio.com.br`

Espere a propagação antes de configurar HTTPS.

## 2. Acessar a VPS

```bash
ssh root@IP_PUBLICO_DA_VPS
```

Crie um usuário de deploy se quiser evitar rodar tudo como root:

```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

## 3. Instalar pacotes do sistema

```bash
sudo apt update
sudo apt install -y git nginx ffmpeg curl unzip
```

## 4. Instalar Node 20 via NVM

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20
node -v
npm -v
```

## 5. Instalar PM2

```bash
npm install -g pm2
pm2 -v
```

## 6. Clonar o repositório

```bash
mkdir -p ~/apps
cd ~/apps
git clone git@github.com:dadocruz/novacena-motion.git
cd novacena-motion
git checkout main
```

Para testar a branch de Lambda antes do merge:

```bash
git checkout feat/render-cloud-lambda
```

## 7. Instalar dependências

```bash
npm install
```

## 8. Criar `.env.production` manualmente

Nunca commite `.env.production`, `.env.local`, `.env*.local`, `.env*.save` ou backups com secrets.

Crie o arquivo diretamente na VPS:

```bash
nano .env.production
```

Modelo:

```bash
NODE_ENV=production
NOVACENA_APP_ORIGIN=https://app.seudominio.com.br

# AI providers, preencha apenas os que usar
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_AI_API_KEY=
GEMINI_API_KEY=

NOVACENA_CLAUDE_MODEL=
NOVACENA_OPENAI_MODEL=
NOVACENA_GEMINI_MODEL=
NOVACENA_CUSTOM_AI_ENDPOINT=
NOVACENA_CUSTOM_AI_KEY=

# Remotion Lambda / AWS
REMOTION_AWS_REGION=us-east-1
REMOTION_AWS_ACCESS_KEY_ID=
REMOTION_AWS_SECRET_ACCESS_KEY=
REMOTION_LAMBDA_FUNCTION_NAME=
REMOTION_LAMBDA_SERVE_URL=
REMOTION_LAMBDA_BUCKET_NAME=
REMOTION_LAMBDA_COMPOSITION=AvailableNow
```

Proteja o arquivo:

```bash
chmod 600 .env.production
```

## 9. Build do app

```bash
npm run build
```

## 10. Rodar com PM2

Use o Next em produção na porta `3000`:

```bash
pm2 start npm --name novacena-motion -- start
pm2 save
pm2 startup
```

Se precisar definir a porta explicitamente:

```bash
PORT=3000 pm2 start npm --name novacena-motion -- start
pm2 save
```

Comandos úteis:

```bash
pm2 status
pm2 logs novacena-motion
pm2 restart novacena-motion
pm2 stop novacena-motion
```

## 11. Configurar Nginx reverse proxy

Crie o arquivo:

```bash
sudo nano /etc/nginx/sites-available/novacena-motion
```

Conteúdo:

```nginx
server {
    listen 80;
    server_name app.seudominio.com.br;

    client_max_body_size 500M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ative:

```bash
sudo ln -s /etc/nginx/sites-available/novacena-motion /etc/nginx/sites-enabled/novacena-motion
sudo nginx -t
sudo systemctl reload nginx
```

## 12. HTTPS com Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d app.seudominio.com.br
```

Teste renovação:

```bash
sudo certbot renew --dry-run
```

## 13. Deploy de atualização

```bash
cd ~/apps/novacena-motion
git pull
npm install
npm run build
pm2 restart novacena-motion
```

## 14. Checklist de produção

- `npm run build` passa na VPS.
- `pm2 status` mostra `novacena-motion` online.
- `https://app.seudominio.com.br` abre o Studio.
- Upload de capa funciona.
- Upload de overlay/elemento funciona.
- `.env.production` existe na VPS e não está no Git.
- `NOVACENA_APP_ORIGIN` usa o domínio final com HTTPS.
- Render local continua disponível.
- Render Lambda será validado isoladamente antes de integrar botão no app.

