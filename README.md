# Image Processing Service

This project is based on [Image Processing Service](https://roadmap.sh/projects/image-processing-service) roadmap.

## Overview

A scalable image processing service built with Node.js that handles image uploads, transformations, and storage. Features include:

- Image upload with size and type validation
- Multiple image transformations (resize, crop, rotate, filters, etc.)
- Asynchronous processing using RabbitMQ
- Caching with Redis
- S3 storage integration
- JWT authentication
- API documentation with Swagger

## Setup

1. Install dependencies:

```sh
npm install

Configure environment variables in .env:
MongoDB connection
AWS credentials
RabbitMQ URL
Redis URL
JWT secret
Start the main server:

npm start

Start the worker process:

npm run worker


API Documentation
Access the Swagger documentation at /api-docs endpoint after starting the server.

Main Features
Image upload and storage
Multiple transformation options
Authentication and authorization
Queue-based processing
Response caching
Rate limiting

```
