# NovaCena Motion v0.4 — App Local Visual

Esta versão foi feita para reduzir o uso do Terminal.

## Como abrir no Mac

1. Copie/substitua os arquivos desta pasta dentro do seu projeto `Desktop/novacena-motion`.
2. Dê dois cliques em `ABRIR_NOVACENA.command`.
3. O navegador abre em `http://localhost:3000`.

Na primeira vez, o Mac pode pedir permissão para abrir o arquivo. Se bloquear:

- Clique com botão direito em `ABRIR_NOVACENA.command`
- Clique em **Abrir**
- Confirme **Abrir** novamente

## O que dá para fazer pela tela

- Escolher template
- Preencher artista, música, data, headline e CTA
- Enviar capa do single
- Escolher plataformas
- Ver preview Story ou Feed
- Salvar projeto
- Gerar o vídeo atual
- Gerar todos os vídeos
- Abrir a pasta `out` com os MP4s

## Observação

Isso ainda é um app local. O próximo passo para virar site online envolve:

- Frontend em Cloudflare/Vercel
- Storage + banco no Supabase
- Render server no Render.com
- Fila/automação com n8n, se necessário
