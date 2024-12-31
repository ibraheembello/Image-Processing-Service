// src/config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;

// src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

module.exports = mongoose.model('User', userSchema);

// src/models/Image.js
const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalUrl: {
    type: String,
    required: true
  },
  transformedUrls: [{
    url: String,
    transformations: Object
  }],
  metadata: {
    filename: String,
    mimetype: String,
    size: Number
  }
}, { timestamps: true });

module.exports = mongoose.model('Image', imageSchema);

// src/middleware/auth.js
const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate' });
  }
};

module.exports = auth;

// src/services/imageProcessor.js
const sharp = require('sharp');

class ImageProcessor {
  static async transform(buffer, transformations) {
    let image = sharp(buffer);
    
    if (transformations.resize) {
      image = image.resize(transformations.resize.width, transformations.resize.height);
    }
    
    if (transformations.crop) {
      image = image.extract({
        left: transformations.crop.x,
        top: transformations.crop.y,
        width: transformations.crop.width,
        height: transformations.crop.height
      });
    }
    
    if (transformations.rotate) {
      image = image.rotate(transformations.rotate);
    }
    
    if (transformations.filters) {
      if (transformations.filters.grayscale) {
        image = image.grayscale();
      }
      if (transformations.filters.sepia) {
        image = image.modulate({ saturation: 0.5 }).tint({ r: 112, g: 66, b: 20 });
      }
    }
    
    if (transformations.format) {
      image = image.toFormat(transformations.format);
    }
    
    return image.toBuffer();
  }
}

module.exports = ImageProcessor;

// src/services/s3Service.js
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

class S3Service {
  static async uploadImage(buffer, filename) {
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `images/${Date.now()}-${filename}`,
      Body: buffer,
      ContentType: 'image/jpeg'
    };
    
    const result = await s3.upload(params).promise();
    return result.Location;
  }
}

module.exports = S3Service;

// src/controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

class AuthController {
  static async register(req, res) {
    try {
      const user = new User(req.body);
      await user.save();
      
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
      res.status(201).json({ user, token });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
  
  static async login(req, res) {
    try {
      const { username, password } = req.body;
      const user = await User.findOne({ username });
      
      if (!user || !(await bcrypt.compare(password, user.password))) {
        throw new Error('Invalid login credentials');
      }
      
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
      res.json({ user, token });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = AuthController;

// src/controllers/imageController.js
const Image = require('../models/Image');
const ImageProcessor = require('../services/imageProcessor');
const S3Service = require('../services/s3Service');
const amqp = require('amqplib');

class ImageController {
  static async upload(req, res) {
    try {
      const { file } = req;
      if (!file) {
        throw new Error('No image file provided');
      }
      
      const originalUrl = await S3Service.uploadImage(file.buffer, file.originalname);
      
      const image = new Image({
        userId: req.user.id,
        originalUrl,
        metadata: {
          filename: file.originalname,
          mimetype: file.mimetype,
          size: file.size
        }
      });
      
      await image.save();
      res.status(201).json(image);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
  
  static async transform(req, res) {
    try {
      const { id } = req.params;
      const { transformations } = req.body;
      
      const image = await Image.findOne({ _id: id, userId: req.user.id });
      if (!image) {
        throw new Error('Image not found');
      }
      
      // Send transformation job to queue
      const channel = await (await amqp.connect(process.env.RABBITMQ_URL)).createChannel();
      await channel.assertQueue('image-transformations');
      
      channel.sendToQueue('image-transformations', Buffer.from(JSON.stringify({
        imageId: id,
        transformations
      })));
      
      res.json({ message: 'Transformation job queued' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
  
  static async list(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      
      const images = await Image.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      const count = await Image.countDocuments({ userId: req.user.id });
      
      res.json({
        images,
        totalPages: Math.ceil(count / limit),
        currentPage: page
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = ImageController;

// src/routes/index.js
const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const ImageController = require('../controllers/imageController');
const auth = require('../middleware/auth');
const multer = require('multer');

const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Auth routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Image routes
router.post('/images', auth, upload.single('image'), ImageController.upload);
router.post('/images/:id/transform', auth, ImageController.transform);
router.get('/images', auth, ImageController.list);

module.exports = router;

// src/app.js
require('dotenv').config();
const express = require('express');
const connectDB = require('./config/database');
const routes = require('./routes');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const app = express();
connectDB();

app.use(express.json());

// Add before routes
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api', routes);

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Add rate limiting
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/images', limiter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});