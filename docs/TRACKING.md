# Tracking NovaCena Motion

O Google Tag Manager e o `dataLayer` são a única fonte de tags do site.

## Configuração

Defina no build/deploy:

```bash
NEXT_PUBLIC_GTM_ID=GTM-P4RX9S2X
```

Não instale `gtag.js`, GA4 ou Google Ads diretamente no código. GA4, Google Ads e conversões devem ser configurados dentro do container GTM.

## Eventos enviados

- `nc_view_motion_landing`: carregamento de `/motion`.
- `nc_whatsapp_click`: clique em qualquer link de WhatsApp.
- `nc_sign_up`: criação de conta.
- `nc_select_plan`: seleção de plano Start, Pro ou Studio.
- `nc_begin_checkout`: início de checkout.
- `nc_purchase`: retorno de pagamento confirmado.
- `nc_render_started`: início de render/exportação.
- `nc_render_completed`: render/exportação concluído.
- `nc_download_clicked`: clique para baixar/abrir vídeo exportado.

O helper central fica em `src/lib/tracking.ts`. Todas as funções rodam apenas no browser, inicializam `window.dataLayer` quando necessário e nunca quebram o fluxo do app.
