require('dotenv').config();
const amqp = require('amqplib');
const Image = require('./models/Image');
const ImageProcessor = require('./services/imageProcessor');
const S3Service = require('./services/s3Service');
const axios = require('axios');

async function startWorker() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    const channel = await connection.createChannel();
    const queue = 'image-transformations';

    await channel.assertQueue(queue);
    console.log('Worker waiting for transformation jobs');

    channel.consume(queue, async (msg) => {
      const { imageId, transformations } = JSON.parse(msg.content.toString());
      try {
        const image = await Image.findById(imageId);
        const imageBuffer = await axios.get(image.originalUrl, { responseType: 'arraybuffer' });
        
        const transformedBuffer = await ImageProcessor.transform(imageBuffer.data, transformations);
        const transformedUrl = await S3Service.uploadImage(transformedBuffer, `transformed-${Date.now()}`);
        
        image.transformedUrls.push({
          url: transformedUrl,
          transformations
        });
        
        await image.save();
        channel.ack(msg);
      } catch (error) {
        console.error('Transformation error:', error);
        channel.nack(msg);
      }
    });
  } catch (error) {
    console.error('Worker error:', error);
    process.exit(1);
  }
}

startWorker();
