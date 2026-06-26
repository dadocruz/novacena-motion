import React from 'react';

/** True quando a composição está sendo renderizada DENTRO do Freeze do poster
 *  (capa = frame congelado). Nesse caso, componentes que usam <Freeze> próprio
 *  (ex.: overlay de vídeo no OverlayLayer) NÃO devem aninhar outro Freeze —
 *  OffthreadVideo não renderiza em Freeze aninhado e o overlay sumiria da capa.
 *  O Freeze do poster já fixa o frame; basta renderizar o OffthreadVideo direto. */
export const PosterFreezeContext = React.createContext(false);
