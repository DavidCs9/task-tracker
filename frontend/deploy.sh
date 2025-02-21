# frontend/deploy.sh
#!/bin/bash

# Exit on error
set -e

# Check if environment parameter is provided
ENVIRONMENT=${1:-dev}

# Get the account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Get the S3 bucket name from CloudFormation outputs
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name task-tracker \
  --query 'Stacks[0].Outputs[?OutputKey==`WebsiteBucketName`].OutputValue' \
  --output text)

# Get the CloudFront distribution ID
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name task-tracker \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomain`].OutputValue' \
  --output text)

# Build the React application
echo "Building React application..."
VITE_API_URL=$(aws cloudformation describe-stacks \
  --stack-name task-tracker \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text) npm run build

# Sync build files to S3
echo "Deploying to S3..."
aws s3 sync dist/ s3://${BUCKET_NAME}/ --delete

# Invalidate CloudFront cache
echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id ${DISTRIBUTION_ID} \
  --paths "/*"

echo "Frontend deployment completed!"
