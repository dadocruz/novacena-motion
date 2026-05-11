# NovaCena Motion v0.5 — MinIO conectado

Esta versão conecta o app local ao MinIO da Automatizadoria.

## O que mudou

- Upload de capa continua salvando cópia local para o Remotion renderizar sem erro.
- A mesma capa também é enviada para o MinIO no bucket `novacena-single-covers`.
- Botão novo no app: **Testar conexão MinIO**.
- Rota nova para futura biblioteca de logos: `/api/assets/platforms`.
- Arquivo `.env.local.example` com o modelo das variáveis.

## Buckets esperados

- `novacena-single-covers`
- `novacena-brand-assets`
- `novacena-renders`
- `novacena-source-videos`

## Depois de copiar esta versão

Rode:

```bash
cd ~/Desktop/novacena-motion
npm install
npm run dev
```

Abra:

```txt
http://localhost:3000
```

Na tela do app:

1. Clique em **Testar conexão MinIO**.
2. Se aparecer `MinIO conectado`, envie uma capa.
3. Clique em **Salvar projeto**.
4. A capa deve aparecer dentro do bucket `novacena-single-covers` no MinIO.

## Segurança

Não envie `.env.local` para GitHub, WhatsApp ou chat. Ele contém a Secret Key do MinIO.
Depois que tudo estiver funcionando, crie uma nova Access Key no MinIO e apague a chave que apareceu em prints.
