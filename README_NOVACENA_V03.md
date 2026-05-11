# NovaCena Motion v0.3

Agora o projeto tem uma tela com cara de app para preencher os dados do motion sem editar o JSON manualmente.

## O que mudou

- Formulário para preencher:
  - nome do artista
  - nome da música
  - data de lançamento
  - headline
  - CTA
  - capa do single
  - template
  - plataformas
  - dados específicos de YouTube e Milestone
- Upload local da capa do single
- Botão **Salvar projeto para render**
- O app salva a capa em `public/uploads/covers/`
- O app atualiza `data/sample-project.json`
- Depois de salvar, `npm run render:all` usa os dados preenchidos no formulário

## Como usar

1. Rode o app:

```bash
npm run dev
```

2. Abra:

```txt
http://localhost:3000
```

3. Preencha os campos.

4. Clique em **Clique para mandar a capa** e escolha a capa do single.

5. Clique em **Salvar projeto para render**.

6. Pare o servidor no Terminal:

```bash
CTRL + C
```

7. Renderize todos os templates:

```bash
npm run render:all
```

8. Abra a pasta de saída:

```bash
open out
```

## Observação importante

A tela de formulário funciona localmente porque o Next.js está rodando no seu Mac e pode salvar arquivos na pasta do projeto.

Quando formos transformar isso em site online de verdade, o upload da capa e os dados do projeto vão precisar ir para Supabase Storage + banco de dados, ou para uma API no Render.
