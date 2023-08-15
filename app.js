// REQUIRES
const request = require("request");
const entities = require("entities");
const feed = require("feed").Feed;
const fastify = require("fastify")({ // and instantiate it
    connectionTimeout: 60 * 1000,
    logger: false, // set this to true for detailed logging
});

// CONSTS
const IS_ENV_DEV = (process.env.ENV == "dev");
const HOST = IS_ENV_DEV ? "localhost" : process.env.HOST;
const RSS_CONTENT_TYPE = "text/xml; charset=UTF-8"; // using "application/rss+xml" causes download dialog in Firefox
const OPENSEA_API_URL = "https://api.opensea.io/api/v1/events";
var opensea_api_req_opts = {
    json: true,
    headers: {
        "X-API-KEY": process.env.OPENSEA_API_KEY,
    },
};
if (IS_ENV_DEV) {
    // spoof curl headers
    opensea_api_req_opts.headers = {
        "Host": `${HOST}:${process.env.PORT}`,
        "User-Agent": "curl/8.1.2",
        "Accept": "*/*",
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": "2",
        "X-API-KEY": process.env.OPENSEA_API_KEY,
    };
    opensea_api_req_opts.body = '{}';
    opensea_api_req_opts.agentOptions = { rejectUnauthorized: false }; // only in DEV mode
    // secureProtocol : "TLSv1_2_method",
}

// point-of-view is a templating manager for fastify
fastify.register(require("point-of-view"), {
    engine: {
        handlebars: require("handlebars"),
    },
});

// Our main GET route
fastify.get("/", function (req, reply) {
    const OPT_EVENT_TYPE = req.query.event_type ? req.query.event_type : "created";
    const OPT_COLLECTION = req.query.collection ? req.query.collection : "cryptopunks";
    const OPT_FLOOR = req.query.floor ? Number.parseFloat(req.query.floor) : 0; // in ETH
    const OPT_REF = req.query.ref ? `?ref=${req.query.ref}` : "";

    switch (OPT_EVENT_TYPE) {
        case "":
        case "created":
        case "successful":
            break;
        default:
            console.log("query event_type invalid");
            return;
    }
    const URL_FINAL =
        OPENSEA_API_URL + "?collection_slug=" + OPT_COLLECTION + "&event_type=" + OPT_EVENT_TYPE;

    request(URL_FINAL, opensea_api_req_opts, (error, res, body) => {
        if (error) {
            console.log(error);
            reply.view("/src/pages/error.hbs", { heading: "ERROR", text: error });
            return;
            // process.exit(1);
        }

        if (res.statusCode != 200) {
            // console.log(res);
            console.log(`res.statusCode: ${res.statusCode}`);
            console.log(body);
            reply.view("/src/pages/error.hbs", { heading: res.statusCode, text: body });
            return;
            // process.exit(1);
        }

        // do something with JSON, using the 'body' variable
        const FEED_OBJ = new feed({
            title: `${OPT_COLLECTION} ${OPT_EVENT_TYPE} | opensea-rss`,
            description: "by @calenfretts",
            id: "https://twitter.com/calenfretts",
            link: `https://opensea.io/collection/${OPT_COLLECTION}${OPT_REF}`,
            language: "en", // optional, used only in RSS 2.0, possible values: http://www.w3.org/TR/REC-html40/struct/dirlang.html#langcodes
            // updated: new Date(), // optional, default = today
            generator: "calenfretts", // optional, default = 'Feed for Node.js'
            feedLinks: {
                json: URL_FINAL,
            },
            author: {
                name: "calenfretts",
                email: "calenfretts.eth",
                link: "https://twitter.com/calenfretts",
            },
        });

        body.asset_events.forEach((post) => {
            const CONTENT_FUNC = function (post) {
                if (!post.asset) {
                    return null;
                }

                const CONTENT_DEFAULT = `<span><img src="${post.asset.image_url}" /></span>`;
                switch (OPT_EVENT_TYPE) {
                    case "created":
                        return CONTENT_DEFAULT;
                        break;
                    case "successful":
                        const POST_PRICE =
                            Number.parseFloat(post.total_price) /
                            Math.pow(10, post.payment_token.decimals);
                        const POST_ETH_PRICE = Number.parseFloat(
                            POST_PRICE * post.payment_token.eth_price
                        );
                        if (POST_ETH_PRICE < OPT_FLOOR) return null;
                        let price_decimals = 2;
                        let payment_symbol = post.payment_token.symbol;
                        let price_str = `${POST_PRICE.toFixed(
                            price_decimals
                        )} ${payment_symbol}`;
                        switch (payment_symbol) {
                            case "ETH":
                                payment_symbol = "Ξ";
                                price_decimals = 3;
                                price_str = `${payment_symbol}${POST_PRICE.toFixed(
                                    price_decimals
                                )}`;
                                break;
                            default:
                                break;
                        }
                        return (
                            `<span>${price_str} (\$${Number.parseFloat(
                                POST_PRICE * post.payment_token.usd_price
                            ).toFixed(2)})</span>` + CONTENT_DEFAULT
                        );
                        break;
                    default:
                        break;
                }
            };

            const ITEM_CONTENT = CONTENT_FUNC(post);
            if (!ITEM_CONTENT) return;

            FEED_OBJ.addItem({
                title: post.asset.name,
                id: post.asset.permalink,
                link: post.asset.permalink + `${OPT_REF}`,
                description: post.description,
                content: ITEM_CONTENT,
                date: new Date(post.created_date),
                image: entities.encodeXML(post.asset.image_url),
            });
        });
        FEED_OBJ.addCategory("NFT");

        reply.type(RSS_CONTENT_TYPE).view("/src/pages/content.hbs", { content: FEED_OBJ.rss2() });
    });
});

// see: https://github.com/fastify/aws-lambda-fastify
if (require.main === module) {
    // Run the server and report out to the logs
    fastify.listen({ port: process.env.PORT, host: '0.0.0.0' }, function (err, address) {
        if (err) {
            fastify.log.error(err);
            process.exit(1);
        }
        console.log(`Your app is listening on:`);
        console.log(`${address}`);
        fastify.log.info(`server listening on ${address}`);
    });
} else {
    // required as a module => executed on aws lambda
    module.exports = fastify;
}
