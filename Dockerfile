FROM public.ecr.aws/lambda/nodejs:12

# Copy function code
COPY package.json ${LAMBDA_TASK_ROOT}
COPY app.js ${LAMBDA_TASK_ROOT}
COPY lambda.js ${LAMBDA_TASK_ROOT}
COPY src ${LAMBDA_TASK_ROOT}/src

RUN npm install

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD [ "lambda.handler" ]
