#!/usr/bin/env bash

set -euo pipefail
umask 077

deployment_dir="/opt/quoska"
environment_file="${deployment_dir}/.env.production"
aws_secret_file="${deployment_dir}/secrets/aws-backup.env"
export_script="${deployment_dir}/deploy/export-supabase-backup.mjs"
analytics_export_script="${deployment_dir}/deploy/export-site-analytics.mjs"
analytics_volume="quoska_analytics_data"
aws_cli_image="public.ecr.aws/aws-cli/aws-cli:2.36.20@sha256:8af59c0d96b104000cce4f11e211c06385240d72c515198159041f13ebe459fa"
work_dir=""

cleanup() {
  if [[ -n "$work_dir" \
    && "$work_dir" == /var/tmp/quoska-backup.* \
    && -d "$work_dir" \
    && ! -L "$work_dir" ]]; then
    find "$work_dir" -xdev -type f -delete
    find "$work_dir" -xdev -depth -type d -empty -delete
  fi
}
trap cleanup EXIT

for required_file in "$environment_file" "$aws_secret_file" "$export_script" "$analytics_export_script"; do
  if [[ ! -r "$required_file" ]]; then
    echo "Cannot read ${required_file}" >&2
    exit 1
  fi
done

set -a
# shellcheck disable=SC1090 -- fixed production paths
. "$environment_file"
# shellcheck disable=SC1090 -- fixed production paths
. "$aws_secret_file"
set +a

: "${NEXT_PUBLIC_SUPABASE_URL:?NEXT_PUBLIC_SUPABASE_URL is required}"
: "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY is required}"
: "${QUOSKA_IMAGE:?QUOSKA_IMAGE is required}"
: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID is required}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY is required}"
: "${AWS_DEFAULT_REGION:?AWS_DEFAULT_REGION is required}"
: "${AWS_S3_BUCKET:?AWS_S3_BUCKET is required}"

if [[ "$AWS_DEFAULT_REGION" != "eu-central-1" ]]; then
  echo "Refusing non-Frankfurt AWS region: ${AWS_DEFAULT_REGION}" >&2
  exit 1
fi
if [[ ${#AWS_S3_BUCKET} -lt 3 \
  || ${#AWS_S3_BUCKET} -gt 63 \
  || ! "$AWS_S3_BUCKET" =~ ^[a-z0-9][a-z0-9.-]*[a-z0-9]$ \
  || "$AWS_S3_BUCKET" == *..* ]]; then
  echo "Refusing invalid AWS backup bucket name: ${AWS_S3_BUCKET}" >&2
  exit 1
fi

work_dir="$(mktemp -d /var/tmp/quoska-backup.XXXXXX)"
if [[ "$work_dir" != /var/tmp/quoska-backup.* || ! -d "$work_dir" || -L "$work_dir" ]]; then
  echo "Unsafe backup working directory: ${work_dir}" >&2
  exit 1
fi
export_dir="${work_dir}/export"
mkdir -m 0700 "$export_dir"

export SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL"
export BACKUP_OUTPUT_DIR="/backup"
export APP_REVISION="$QUOSKA_IMAGE"

docker run --rm \
  --user 0:0 \
  --read-only \
  --network bridge \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --tmpfs /tmp:rw,nosuid,nodev,size=16m,mode=1777 \
  --env SUPABASE_URL \
  --env SUPABASE_SERVICE_ROLE_KEY \
  --env BACKUP_OUTPUT_DIR \
  --env APP_REVISION \
  --volume "${export_script}:/quoska-export.mjs:ro" \
  --volume "${export_dir}:/backup" \
  --entrypoint node \
  "$QUOSKA_IMAGE" \
  /quoska-export.mjs

volume_project="$(docker volume inspect "$analytics_volume" --format '{{ index .Labels "com.docker.compose.project" }}')"
volume_name="$(docker volume inspect "$analytics_volume" --format '{{ index .Labels "com.docker.compose.volume" }}')"
if [[ "$volume_project" != "quoska" || "$volume_name" != "analytics_data" ]]; then
  echo "Refusing unexpected analytics volume: ${analytics_volume}" >&2
  exit 1
fi

export ANALYTICS_BACKUP_SOURCE="/analytics/site-analytics.sqlite"
export ANALYTICS_BACKUP_OUTPUT_DIR="/backup/analytics"
docker run --rm \
  --user 0:0 \
  --read-only \
  --network none \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --tmpfs /tmp:rw,nosuid,nodev,size=16m,mode=1777 \
  --env ANALYTICS_BACKUP_SOURCE \
  --env ANALYTICS_BACKUP_OUTPUT_DIR \
  --volume "${analytics_export_script}:/app/quoska-analytics-export.mjs:ro" \
  --volume "${analytics_volume}:/analytics" \
  --volume "${export_dir}:/backup" \
  --entrypoint node \
  "$QUOSKA_IMAGE" \
  /app/quoska-analytics-export.mjs

if [[ -f "${export_dir}/analytics/site-analytics.sqlite" ]]; then
  (
    cd "$export_dir"
    sha256sum analytics/site-analytics.sqlite analytics/manifest.json >> SHA256SUMS
    sort -o SHA256SUMS SHA256SUMS
  )
fi

(
  cd "$export_dir"
  sha256sum --quiet --check SHA256SUMS
)

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
archive_name="quoska-production-${timestamp}.tar.gz"
archive_path="${work_dir}/${archive_name}"

tar \
  --sort=name \
  --mtime='UTC 1970-01-01' \
  --owner=0 \
  --group=0 \
  --numeric-owner \
  -C "$export_dir" \
  -czf "$archive_path" \
  .

(
  cd "$work_dir"
  sha256sum "$archive_name" > "${archive_name}.sha256"
)

aws_destination="s3://${AWS_S3_BUCKET}/backups/${archive_name}"
docker run --rm \
  --read-only \
  --network bridge \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --tmpfs /tmp:rw,nosuid,nodev,size=16m,mode=1777 \
  --env AWS_ACCESS_KEY_ID \
  --env AWS_SECRET_ACCESS_KEY \
  --env AWS_DEFAULT_REGION \
  --volume "${work_dir}:/backup:ro" \
  "$aws_cli_image" \
  s3 cp "/backup/${archive_name}" "$aws_destination" \
  --sse AES256 \
  --only-show-errors

docker run --rm \
  --read-only \
  --network bridge \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --tmpfs /tmp:rw,nosuid,nodev,size=16m,mode=1777 \
  --env AWS_ACCESS_KEY_ID \
  --env AWS_SECRET_ACCESS_KEY \
  --env AWS_DEFAULT_REGION \
  --volume "${work_dir}:/backup:ro" \
  "$aws_cli_image" \
  s3 cp "/backup/${archive_name}.sha256" "${aws_destination}.sha256" \
  --sse AES256 \
  --only-show-errors

printf 'Uploaded %s and its checksum to the protected S3 backup bucket.\n' "$archive_name"
