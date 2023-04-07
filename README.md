Demo repository to deploy and run [Cloud Run Job](https://cloud.google.com/run/docs)


## 1. Login

```sh
gcloud auth login
```


## 2. Enable services

```sh
gcloud services enable \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  run.googleapis.com
```

## 3. Setup service account

```sh

PROJECT_ID=$(gcloud config get-value project)
SERVICE_ACCOUNT_ID="demo-cloud-run-sa"
SERVICE_ACCOUNT_DISPLAY_NAME="Cloud Run Demo Service account"

gcloud iam service-accounts create $SERVICE_ACCOUNT_ID --display-name=$SERVICE_ACCOUNT_DISPLAY_NAME

```

Adding `roles/storage.admin` role only because the example script writes to bucket. 
Add appropriate permissions that fits your needs

```sh
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --role roles/storage.admin \
  --member serviceAccount:$SERVICE_ACCOUNT_ID@$PROJECT_ID.iam.gserviceaccount.com
```

## 4. Create Artifacts Registry

```sh
# https://cloud.google.com/artifact-registry/docs/docker/pushing-and-pulling?hl=en
# update to fit your need
REPO_NAME="pg-docker"
REPO_DESCRIPTION="registry for demo docker imgs"
LOCATION=us-east4
REGISTRY_URL=$LOCATION-docker.pkg.dev

gcloud artifacts repositories create $REPO_NAME \
    --repository-format=docker \
    --location=$LOCATION \
    --description="$REPO_DESCRIPTION"

gcloud auth configure-docker $REGISTRY_URL

```

### 5. Build and push docker image

```sh

LOCATION=us-east4
REGISTRY_URL=$LOCATION-docker.pkg.dev
IMAGE_NAME=demo-cloud-run
TAG=latest
DOCKER_IMAGE_TAG=$REGISTRY_URL/$PROJECT_ID/$REPO_NAME/$IMAGE_NAME:$TAG

# For AMD Mac, run: docker build . --platform=linux/amd64 -t $DOCKER_IMAGE_TAG
docker build . -t $DOCKER_IMAGE_TAG
docker push $DOCKER_IMAGE_TAG

```

### 6. Create Job

```sh

JOB_NAME=demo-cloud-run-job
REGION=$(gcloud config get-value compute/region)
TIMEOUT=5m
TASK_NUM=2


gcloud run jobs create $JOB_NAME \
  --image=$DOCKER_IMAGE_TAG \
  --args="https://example.com" \
  --args="https://cloud.google.com" \
  --tasks=$TASK_NUM \
  --task-timeout=$TIMEOUT \
  --region=$REGION \
  --set-env-vars=BUCKET_NAME=demo-cloud-run-$PROJECT_ID \
  --service-account=$SERVICE_ACCOUNT_ID@$PROJECT_ID.iam.gserviceaccount.com

```

To update existing job, replace `create` by `update`.

### 7. Execute Job

```sh
gcloud run jobs execute $JOB_NAME --region=$REGION
```

## Notes:

### Parametrized runs
Unfortunately We cannot pass parameters to Cloud Run Jobs. However, there's trick to use `--args` and `CLOUD_RUN_TASK_INDEX`. 

Values passed to `--args` will be accessible via process.argv from scripts. Then we may utilize `CLOUD_RUN_TASK_INDEX` to tell each script which argument to process. See `src/index.js` for example.

## References:
https://cloud.google.com/run/docs/create-jobs?authuser=1
https://cloud.google.com/run/docs/quickstarts/jobs/build-create-nodejs