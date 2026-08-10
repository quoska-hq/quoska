#!/usr/bin/env bash
set -euo pipefail

job="${1:-}"
case "$job" in
  notifications|retention) ;;
  *)
    echo "Usage: $0 notifications|retention" >&2
    exit 64
    ;;
esac

deployment_dir="/opt/quoska"
environment_file="${deployment_dir}/.env.production"

if [[ ! -r "$environment_file" ]]; then
  echo "Cannot read ${environment_file}" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090 -- fixed production path
. "$environment_file"
set +a

: "${QUOSKA_DOMAIN:?QUOSKA_DOMAIN is required}"
: "${CRON_SECRET:?CRON_SECRET is required}"

# Feed the authorization header through stdin so the secret is not placed in
# the curl process arguments or systemd unit definition.
printf 'url = "https://%s/api/v1/cron/%s"\nheader = "Authorization: Bearer %s"\nrequest = "POST"\n' \
  "$QUOSKA_DOMAIN" "$job" "$CRON_SECRET" \
  | curl --config - --fail --silent --show-error --retry 2 --max-time 120
