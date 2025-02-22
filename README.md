# Task Time Tracker

A distributed task tracking application with AWS X-Ray integration.

## Prerequisites

- AWS CLI configured with appropriate credentials
- Docker and Docker Compose installed
- Node.js 18+ installed

## Local Development

1. Clone the repository
2. Create a `.env` file with your AWS credentials
3. Run `compose up --build`
4. Frontend will be available at http://localhost:5173
5. Backend will be available at http://localhost:3000

## Deployment

1. Deploy the CloudFormation stack:

```bash
aws cloudformation deploy \
     --stack-name task-tracker \
     --template-file infrastructure/template.yml \
     --capabilities CAPABILITY_IAM
```
