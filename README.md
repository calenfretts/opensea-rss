# opensea-rss
## RSS feeds for OpenSea collections

I originally created this as a glitch called [opensea-bot](https://glitch.com/edit/#!/opensea-bot).

But now let's [Dockerize it to deploy on Lambda](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-image.html#nodejs-image-instructions).

## Usage
Update .env with your OPENSEA_API_KEY

Use query params e.g. ?collection=fidenza-by-tyler-hobbs&event_type=successful&floor=0

Valid `event_type`s: created (default), successful
