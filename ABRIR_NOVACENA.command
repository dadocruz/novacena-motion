#!/bin/zsh
cd "$(dirname "$0")"
clear
echo "===================================="
echo "  NovaCena Motion — iniciando app"
echo "===================================="
echo ""
if [ ! -d "node_modules" ]; then
  echo "Instalando dependências na primeira abertura..."
  npm install
fi
echo "Abrindo o app em http://localhost:3000 ..."
(sleep 2 && open "http://localhost:3000") &
npm run dev
