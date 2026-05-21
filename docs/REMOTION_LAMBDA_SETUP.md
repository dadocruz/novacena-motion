# Remotion Lambda Setup

Guia para preparar render em nuvem via AWS Remotion Lambda sem remover o render local.

## Regra de segurança

Nunca commite chaves AWS, OpenAI, Gemini, Anthropic ou qualquer secret.

Arquivos que devem ficar apenas localmente ou na VPS:

- `.env.local`
- `.env.production`
- `.env*.local`
- `.env*.save`
- arquivos `.save` com secrets

Se uma chave já foi compartilhada em chat, log ou commit, rotacione a chave no provedor.

## Variáveis necessárias

Configure em `.env.local` para teste local e em `.env.production` na VPS:

```bash
REMOTION_AWS_REGION=us-east-1
REMOTION_AWS_ACCESS_KEY_ID=
REMOTION_AWS_SECRET_ACCESS_KEY=
REMOTION_LAMBDA_FUNCTION_NAME=
REMOTION_LAMBDA_SERVE_URL=
REMOTION_LAMBDA_BUCKET_NAME=
REMOTION_LAMBDA_COMPOSITION=AvailableNow
```

Variáveis de AI podem existir no mesmo arquivo, mas não são requisito para validar Lambda:

```bash
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_AI_API_KEY=
GEMINI_API_KEY=
```

## Scripts disponíveis

```bash
npm run lambda:validate
npm run lambda:functions
npm run lambda:sites
npm run lambda:test
```

Eles mapeiam para:

```bash
remotion lambda policies validate
remotion lambda functions
remotion lambda sites
node --env-file=.env.local scripts/test-lambda-render.mjs
```

## 1. Instalar dependências

```bash
npm install
```

O projeto já depende de `@remotion/lambda`.

## 2. Validar permissões AWS

Com `.env.local` preenchido:

```bash
npx remotion lambda policies validate
```

Ou:

```bash
npm run lambda:validate
```

Se falhar, ajuste o usuário IAM/role antes de seguir. Não use usuário root da AWS.

## 3. Deploy da função Lambda

Use a CLI do Remotion Lambda para criar/deployar a função na região configurada.

Exemplo base:

```bash
npx remotion lambda functions deploy
```

Depois liste as funções:

```bash
npm run lambda:functions
```

Copie o nome da função criada para:

```bash
REMOTION_LAMBDA_FUNCTION_NAME=
```

## 4. Deploy do site/bundle Remotion

Faça deploy do bundle Remotion para S3:

```bash
npx remotion lambda sites create remotion-entry/index.ts
```

Depois liste os sites:

```bash
npm run lambda:sites
```

Copie a URL S3/serve URL gerada para:

```bash
REMOTION_LAMBDA_SERVE_URL=
```

## 5. Configurar bucket

O bucket pode ser o bucket criado/gerenciado pelo Remotion Lambda.

Configure:

```bash
REMOTION_LAMBDA_BUCKET_NAME=
```

O script isolado usa o bucket retornado pelo `renderMediaOnLambda`, mas manter a env preenchida ajuda a padronizar a VPS e a futura integração no app.

## 6. Teste isolado de render Lambda

Antes de integrar botão no app, rode:

```bash
npm run lambda:test
```

O script:

- lê `.env.local` via `node --env-file=.env.local`;
- usa `REMOTION_LAMBDA_FUNCTION_NAME`;
- usa `REMOTION_LAMBDA_SERVE_URL`;
- usa `REMOTION_AWS_REGION`;
- renderiza a composition de teste;
- acompanha progresso com `getRenderProgress`;
- imprime a URL final do arquivo.

Você também pode trocar a composition:

```bash
REMOTION_LAMBDA_COMPOSITION=AvailableNow npm run lambda:test
```

## 7. O que ainda não fazer

- Não integrar botão de render cloud no Studio antes do teste isolado passar.
- Não remover scripts de render local.
- Não depender da VPS para render pesado.
- Não salvar chaves no Git.

## 8. Próximo passo após validação

Quando `npm run lambda:test` retornar uma URL final:

1. Criar uma rota server-side no Next para solicitar render Lambda.
2. Validar input props do projeto atual.
3. Salvar status do job.
4. Exibir progresso no Studio.
5. Retornar URL final de download.
6. Manter render local como fallback/admin.

## Troubleshooting

### `AccessDenied`

Rode:

```bash
npm run lambda:validate
```

Revise políticas IAM do usuário usado em `REMOTION_AWS_ACCESS_KEY_ID`.

### Função não encontrada

Confira:

```bash
npm run lambda:functions
```

Depois ajuste:

```bash
REMOTION_LAMBDA_FUNCTION_NAME=
```

### Serve URL inválida

Confira:

```bash
npm run lambda:sites
```

Depois ajuste:

```bash
REMOTION_LAMBDA_SERVE_URL=
```

### Render local continua funcionando, mas Lambda falha

Verifique se assets usados no render estão acessíveis pelo bundle/site Lambda. Uploads locais da VPS não são automaticamente enviados para Lambda. Na integração futura, os assets do projeto precisarão estar em storage acessível pela Lambda, como S3/Remotion bucket, R2 ou outro endpoint público assinado.

