#!/usr/bin/env bash
# Publica o painel no servidor (mesma EC2 da API, servido pelo Caddy em
# https://painel.agaxismetalforte.com.br, bloco no Caddyfile da AG-SYSTEM-API).
#   npm run deploy
# Precisa: chave SSH ~/.ssh/ag-erp.pem e o seu IP liberado na porta 22 do
# security group ag-erp-api.
set -euo pipefail

HOST=${AG_HOST:-ubuntu@13.184.65.13}
KEY=${AG_KEY:-$HOME/.ssh/ag-erp.pem}
DEST=/var/www/ag-painel
cd "$(dirname "$0")/.."

echo "==> Build"
npm run build

echo "==> Enviando"
tar -C dist -czf - . | ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "$HOST" "
  set -e
  tmp=\$(mktemp -d)
  tar -C \"\$tmp\" -xzf -
  sudo install -d -o root -g root -m 755 $DEST
  # Troca de uma vez: quem está com o site aberto não pega meio a meio.
  sudo rm -rf $DEST.new && sudo mv \"\$tmp\" $DEST.new
  sudo chmod -R a+rX $DEST.new
  sudo rm -rf $DEST.old && sudo mv $DEST $DEST.old && sudo mv $DEST.new $DEST && sudo rm -rf $DEST.old
  echo \"Publicado em $DEST: \$(ls $DEST | tr '\n' ' ')\"
"
echo "==> Pronto: https://painel.agaxismetalforte.com.br"
