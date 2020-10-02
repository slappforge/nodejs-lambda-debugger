#!/bin/sh

LAYER_NAME=slappforge-debug-nodejs
LAYER_BUILD_VERSION=1-0-0-build-01

# shellcheck disable=SC2039
read -r -p "Name of the deployment archive: " deploymentArchive
# shellcheck disable=SC2039
read -r -p "AWS profile name: " profileName

layerName=${LAYER_NAME}-${LAYER_BUILD_VERSION}

# shellcheck disable=SC2039
lambdaRegions=(us-east-1 us-east-2 us-west-1 us-west-2 ap-south-1 ap-northeast-2 ap-southeast-1 ap-southeast-2
ap-northeast-1 ca-central-1 eu-central-1 eu-west-1 eu-west-2 eu-west-3 eu-north-1 sa-east-1)

# shellcheck disable=SC2039
echo "Publishing layer: ${layerName} ..."
# shellcheck disable=SC2039
for region in "${lambdaRegions[@]}"; do
  printf "%s " "${region}"

  layerVersion=$(aws lambda publish-layer-version \
    --region "${region}" \
    --layer-name "${layerName}" \
    --description "SLAppForge Live Debug for AWS - NodeJS ${LAYER_BUILD_VERSION}" \
    --zip-file fileb://"${deploymentArchive}" \
    --compatible-runtimes nodejs10.x nodejs12.x \
    --profile "${profileName}" \
    --query Version)

  aws lambda add-layer-version-permission \
    --region "${region}" \
    --layer-name "${layerName}" \
    --version-number "${layerVersion}" \
    --statement-id "GlobalPermVer${layerVersion}" \
    --action "lambda:GetLayerVersion" \
    --principal "*" \
    --profile "${profileName}" > /dev/null

  echo "arn:aws:lambda:${region}:892904900711:layer:${layerName}:${layerVersion}"
done
