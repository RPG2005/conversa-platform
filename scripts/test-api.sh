#!/usr/bin/env bash
set -euo pipefail
suite="${1:-all}"
test_password="${TEST_PASSWORD:-local-test-password-123}"
project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
collection="$project_root/postman/collections/chat-yes-no-api"
environment="$project_root/postman/environments/local.environment.yaml"
run_id="$(date +%s%3N)"
attachment_file=""
case "$suite" in core|attachments|all) ;; *) echo "Uso: $0 [core|attachments|all]" >&2; exit 2 ;; esac
command -v postman >/dev/null || { echo 'Postman CLI no está instalado o no está en PATH.' >&2; exit 1; }
for attempt in {1..20}; do curl --fail --silent http://localhost:3000/health >/dev/null && break; sleep 1; done
curl --fail --silent http://localhost:3000/health >/dev/null || { echo 'La API no está sana. Ejecuta docker compose --profile app up -d --build api.' >&2; exit 1; }
requests=(health register-ada register-bob register-eve register-Mallory create-conversation eve-cannot-read add-eve send-ada-message send-bob-message list-first-message-page list-next-message-page 'Sync messages after reconnect' 'Get notification preferences' 'Update notification preferences')
if [[ "$suite" == attachments || "$suite" == all ]]; then
  attachment_file="$(mktemp -t "chat-yes-no-${run_id}-XXXXXX.pdf")"
  trap 'rm -f "$attachment_file"' EXIT
  dd if=/dev/zero of="$attachment_file" bs=1024 count=1 status=none
  requests+=('Create attachment upload URL' 'Upload attachment binary' 'Complete attachment upload' 'Send Ada message with attachment' 'Get attachment download URL')
fi
if [[ "$suite" == attachments ]]; then requests=(health register-ada register-bob create-conversation 'Create attachment upload URL' 'Upload attachment binary' 'Complete attachment upload' 'Send Ada message with attachment' 'Get attachment download URL'); fi
args=(collection run "$collection" -e "$environment" --env-var "test_password=$test_password" --env-var "run_id=$run_id" --timeout-request 10000)
[[ -n "$attachment_file" ]] && args+=(--env-var "attachment_file_path=$attachment_file")
for request in "${requests[@]}"; do args+=(-i "$request"); done
echo "Ejecutando suite '$suite' con run_id=$run_id"
postman "${args[@]}"
echo 'Pruebas HTTP terminadas. Consulta docs/NOTIFICATIONS_TESTING.md para WebSocket y Mailpit.'
