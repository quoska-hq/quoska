#!/usr/bin/env bash

set -euo pipefail

AWS_BIN="${AWS_BIN:-aws}"
AWS_REGION="${AWS_REGION:-eu-central-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:?Set AWS_ACCOUNT_ID}"
BACKUP_BUCKET="${BACKUP_BUCKET:?Set BACKUP_BUCKET}"
BACKUP_USER="${BACKUP_USER:-quoska-prod-backup-writer}"

expected_bucket="quoska-prod-backups-${AWS_ACCOUNT_ID}"
if [[ "$BACKUP_BUCKET" != "$expected_bucket" ]]; then
  echo "Refusing unexpected bucket name: $BACKUP_BUCKET" >&2
  echo "Expected: $expected_bucket" >&2
  exit 1
fi

if [[ "$AWS_REGION" != "eu-central-1" ]]; then
  echo "Refusing non-Frankfurt region: $AWS_REGION" >&2
  exit 1
fi

caller_account="$($AWS_BIN sts get-caller-identity --query Account --output text)"
if [[ "$caller_account" != "$AWS_ACCOUNT_ID" ]]; then
  echo "Authenticated AWS account $caller_account does not match $AWS_ACCOUNT_ID" >&2
  exit 1
fi

owned_bucket="$($AWS_BIN s3api list-buckets \
  --query "Buckets[?Name=='${BACKUP_BUCKET}'].Name | [0]" \
  --output text)"

if [[ "$owned_bucket" == "None" ]]; then
  $AWS_BIN s3api create-bucket \
    --bucket "$BACKUP_BUCKET" \
    --region "$AWS_REGION" \
    --create-bucket-configuration "LocationConstraint=${AWS_REGION}" \
    >/dev/null
elif [[ "$owned_bucket" != "$BACKUP_BUCKET" ]]; then
  echo "Unexpected bucket lookup result: $owned_bucket" >&2
  exit 1
fi

$AWS_BIN s3api put-public-access-block \
  --bucket "$BACKUP_BUCKET" \
  --public-access-block-configuration \
    'BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true'

$AWS_BIN s3api put-bucket-ownership-controls \
  --bucket "$BACKUP_BUCKET" \
  --ownership-controls 'Rules=[{ObjectOwnership=BucketOwnerEnforced}]'

$AWS_BIN s3api put-bucket-encryption \
  --bucket "$BACKUP_BUCKET" \
  --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":false}]}'

$AWS_BIN s3api put-bucket-versioning \
  --bucket "$BACKUP_BUCKET" \
  --versioning-configuration 'Status=Enabled'

lifecycle_json="$(jq -nc '{
  Rules: [{
    ID: "QuoskaBackupRetention",
    Status: "Enabled",
    Filter: {Prefix: "backups/"},
    Expiration: {Days: 31},
    NoncurrentVersionExpiration: {NoncurrentDays: 7},
    AbortIncompleteMultipartUpload: {DaysAfterInitiation: 1}
  }]
}')"
$AWS_BIN s3api put-bucket-lifecycle-configuration \
  --bucket "$BACKUP_BUCKET" \
  --lifecycle-configuration "$lifecycle_json"

$AWS_BIN s3api put-bucket-tagging \
  --bucket "$BACKUP_BUCKET" \
  --tagging 'TagSet=[{Key=application,Value=quoska},{Key=environment,Value=production},{Key=data-classification,Value=confidential},{Key=managed-by,Value=aws-cli}]'

bucket_policy="$({
  jq -nc --arg bucket "$BACKUP_BUCKET" '{
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "DenyInsecureTransport",
        Effect: "Deny",
        Principal: "*",
        Action: "s3:*",
        Resource: ["arn:aws:s3:::" + $bucket, "arn:aws:s3:::" + $bucket + "/*"],
        Condition: {Bool: {"aws:SecureTransport": "false"}}
      },
      {
        Sid: "DenyUnencryptedBackupUploads",
        Effect: "Deny",
        Principal: "*",
        Action: "s3:PutObject",
        Resource: "arn:aws:s3:::" + $bucket + "/backups/*",
        Condition: {StringNotEquals: {"s3:x-amz-server-side-encryption": "AES256"}}
      }
    ]
  }'
})"
$AWS_BIN s3api put-bucket-policy \
  --bucket "$BACKUP_BUCKET" \
  --policy "$bucket_policy"

if ! $AWS_BIN iam get-user --user-name "$BACKUP_USER" >/dev/null 2>&1; then
  $AWS_BIN iam create-user \
    --user-name "$BACKUP_USER" \
    --tags Key=application,Value=quoska Key=environment,Value=production Key=purpose,Value=backup-upload \
    >/dev/null
fi

writer_policy="$({
  jq -nc --arg bucket "$BACKUP_BUCKET" '{
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "ReadBucketLocationForUploads",
        Effect: "Allow",
        Action: ["s3:GetBucketLocation", "s3:ListBucketMultipartUploads"],
        Resource: "arn:aws:s3:::" + $bucket
      },
      {
        Sid: "UploadEncryptedQuoskaBackupsOnly",
        Effect: "Allow",
        Action: ["s3:PutObject", "s3:AbortMultipartUpload", "s3:ListMultipartUploadParts"],
        Resource: "arn:aws:s3:::" + $bucket + "/backups/*",
        Condition: {StringEquals: {"s3:x-amz-server-side-encryption": "AES256"}}
      }
    ]
  }'
})"
$AWS_BIN iam put-user-policy \
  --user-name "$BACKUP_USER" \
  --policy-name QuoskaProductionBackupUpload \
  --policy-document "$writer_policy"

echo "Configured s3://${BACKUP_BUCKET}/backups/ and IAM user ${BACKUP_USER}."
echo "No access key was created by this script."
