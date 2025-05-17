<p align="center">
  <a href="https://www.medusajs.com">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/59018053/229103275-b5e482bb-4601-46e6-8142-244f531cebdb.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-4970-8a1f-c6af37f087bf.svg">
    <img alt="Medusa logo" src="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-4970-8a1f-c6af37f087bf.svg">
    </picture>
  </a>
</p>
<h1 align="center">
  Medusa Plugin Starter
</h1>

<h4 align="center">
  <a href="https://docs.medusajs.com">Documentation</a> |
  <a href="https://www.medusajs.com">Website</a>
</h4>

<p align="center">
  Building blocks for digital commerce
</p>
<p align="center">
  <a href="https://github.com/medusajs/medusa/blob/master/CONTRIBUTING.md">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat" alt="PRs welcome!" />
  </a>
    <a href="https://www.producthunt.com/posts/medusa"><img src="https://img.shields.io/badge/Product%20Hunt-%231%20Product%20of%20the%20Day-%23DA552E" alt="Product Hunt"></a>
  <a href="https://discord.gg/xpCwq3Kfn8">
    <img src="https://img.shields.io/badge/chat-on%20discord-7289DA.svg" alt="Discord Chat" />
  </a>
  <a href="https://twitter.com/intent/follow?screen_name=medusajs">
    <img src="https://img.shields.io/twitter/follow/medusajs.svg?label=Follow%20@medusajs" alt="Follow @medusajs" />
  </a>
</p>

## Compatibility

This starter is compatible with versions >= 2.4.0 of `@medusajs/medusa`.

## Installation

1. Install the plugin using the command:

```bash
...
npm install recommendation-plugin-for-medusa
...
```

2. Add plugin to your `medusa-config.js`:

```js
...
plugins: [
    {
      resolve: "recommendation-plugin-for-medusa",
      options: {
        capitalize: true,
        apiKey: true,
      },
    },
  ],
...
```

3. Install dependencies

```bash
...
npm install Natural stopword class-validator
...
```

4. Enable REDIS caching module

A detailed description of the connection can be found at the link - https://docs.medusajs.com/resources/infrastructure-modules/cache/redis

### Database migration

Medusa recommedation plugin introduces new models in database. To have it working, you need to firstly execute migrations:

```bash
npx medusa db:migrate
```

### Copy the code

You can copy the code from /src into your Medusa project.

Add module to `medusa-config.js`:

```js
  {
    resolve: "./modules/review",
  }
```

### Database migration

Medusa recommedation plugin introduces new models in database. To have it working, you need to firstly execute migrations:

```bash
npx medusa db:migrate
```

## Overview

The following APIs are used to use the recommendation plugin:

POST request for content filtering recommendations, the request body must contain the identifiers of the products for which recommendations are needed

```
http://localhost:9000/store/contentRecommendation

```

POST request for collaborative filtering recommendations, the request body must contain the target user ID

```
http://localhost:9000/store/collaborativeRecommendation

```

POST request for hybrid recommendations, the request body must contain an array of product IDs and the target user ID

```
http://localhost:9000/store/hybridRecommendation

```
