# NovaCena AI Automation System

## Objetivo

Transformar o NovaCena em um motor de criação automática de artes e motions para música.

O sistema deve receber capa, PSD, vídeo, briefing, logo, foto de artista ou referência visual e gerar automaticamente:

- Story 1080x1920
- Feed 1x1
- Variações por plataforma
- Motion com entrada, bounce, wiggle, parallax, glow e transições
- Layout respeitando safe zone
- Textos, fontes e paleta baseados na capa ou referência

## Filosofia

PSD = estrutura visual  
After Effects = linguagem de movimento  
IA = diretor criativo e planejador  
NovaCena = motor editável  
Remotion = render final  

A IA não deve mexer direto no Remotion sem passar por JSON estruturado.

## Pipeline

1. Usuário envia capa, PSD, MP4, logo, briefing ou referência.
2. IA analisa paleta, fonte, clima visual, contraste, composição e safe zone.
3. IA escolhe template-base.
4. IA gera plano JSON.
5. NovaCena aplica layout e motion.
6. Remotion renderiza preview.
7. IA revisa legibilidade, rosto, logo, safe zone e CTA.
8. Sistema ajusta ou pede aprovação humana.

## Templates iniciais

### Spotify Milestone Neon

Usado para:
- 250K plays
- 240K ouvintes
- 10K ouvintes mensais
- 1 milhão de streams

Ordem de comunicação:
1. Logo ou selo do artista
2. Headline: ULTRAPASSAMOS
3. Número gigante
4. Label: PLAYS / OUVINTES / OUVINTES MENSAIS
5. Capa com motion
6. Plataforma
7. Fundo vivo com palco, glow e partículas

Regras:
- Número precisa ter impacto máximo.
- Capa não pode ficar parada desde o início.
- Número pode ser texto nativo, imagem enviada ou estilo gerado por referência.
- Story e 1x1 precisam ser diagramados separadamente.
- Safe zone obrigatória.

### YouTube Watch Story

Usado para:
- Assista no YouTube
- Novo clipe
- Vídeo disponível
- Chamada para canal

Ordem:
1. BG de artista/vídeo
2. Ícones YouTube flutuando
3. Texto ASSISTA NO
4. Texto YOUTUBE
5. Card/capa central
6. Arroba ou CTA
7. Branding final

### Available Now Elegant

Usado para:
- Disponível
- Lançamento
- Pré-save
- Gospel/elegante
- Romântico/acústico

Ordem:
1. Fundo emocional ou blur da capa
2. Texto DISPONÍVEL / LANÇAMENTO
3. Data opcional
4. Capa central
5. Nome da música/artista
6. Plataformas
7. CTA final

## O que a IA pode mudar

- Fonte
- Paleta
- Diagramação
- Posição
- Tamanho
- Timing
- Intensidade de motion
- Background
- Texturas
- Glow
- Estilo do número
- Distribuição para story e 1x1

## O que a IA não pode fazer

- Cortar rosto importante
- Cobrir olhos/boca
- Cortar logo
- Sair da safe zone
- Deixar CTA ilegível
- Poluir demais
- Achatar capa sem proporção
- Ignorar a ordem de comunicação

## Estratégia para número grande

O número deve suportar:

1. native_text
2. styled_text_from_reference
3. uploaded_graphic

## Estratégia de providers

O sistema deve aceitar qualquer IA por adapter:

- Gemini
- OpenAI
- Grok
- Claude
- VEO
- Custom HTTP
