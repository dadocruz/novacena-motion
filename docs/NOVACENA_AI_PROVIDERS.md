# NovaCena AI Providers

## Provider mock

O provider `mock` é usado para testar o fluxo sem gastar tokens.

Ele responde com:

- análise visual simulada
- plano de motion simulado
- layout story + 1x1
- safe zones
- motion preset

## Provider custom-http

O provider `custom-http` permite conectar qualquer IA externa desde que exista uma URL HTTP que aceite JSON.

Configure em `.env.local`:

NOVACENA_CUSTOM_AI_ENDPOINT=https://sua-api.com/novacena-ai
NOVACENA_CUSTOM_AI_KEY=sua-chave

O NovaCena envia para a API externa um JSON com:

- task: analyze_visual
- task: generate_plan
- task: review_render

A API externa deve responder no mesmo schema usado pelo NovaCena.
