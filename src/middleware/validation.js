const validateTransformation = (req, res, next) => {
  const { transformations } = req.body;
  
  if (!transformations) {
    return res.status(400).json({ error: 'Transformations required' });
  }

  const allowedTransformations = [
    'resize', 'crop', 'rotate', 'filters',
    'format', 'flip', 'flop', 'watermark', 'compress'
  ];

  const invalidTransformations = Object.keys(transformations)
    .filter(key => !allowedTransformations.includes(key));

  if (invalidTransformations.length > 0) {
    return res.status(400).json({ 
      error: `Invalid transformations: ${invalidTransformations.join(', ')}` 
    });
  }

  next();
};

module.exports = { validateTransformation };
