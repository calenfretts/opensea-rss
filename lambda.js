// see: https://github.com/fastify/aws-lambda-fastify
const awsLambdaFastify = require("@fastify/aws-lambda");
const app = require("./app");

const proxy = awsLambdaFastify(app);
// or
// const proxy = awsLambdaFastify(app, { binaryMimeTypes: ["application/octet-stream"], serializeLambdaArguments: false /* default is true */ });

// exports.handler = proxy;
// or
// exports.handler = (event, context, callback) => proxy(event, context, callback);
// or
// exports.handler = (event, context) => proxy(event, context);
// or
// exports.handler = async (event, context) => proxy(event, context);
exports.handler = async (event, context, callback) => {
    const response = await proxy(event, context, callback);
    // const response = {
    //     statusCode: 200,
    //     headers: {
    //         'Content-Type': 'text/html',
    //     },
    //     body: JSON.stringify(context),
    // };
    response.headers = {
        "Content-Type": "text/html",
    };
    callback(null, response); // sending HTML back
}
