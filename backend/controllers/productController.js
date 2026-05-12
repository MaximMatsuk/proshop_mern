import asyncHandler from 'express-async-handler'
import Product from '../models/productModel.js'
import Order from '../models/orderModel.js'
import { isFeatureEnabled } from '../utils/featureFlags.js'

// @desc    Fetch all products
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  const pageSize = 10
  const page = Number(req.query.pageNumber) || 1

  let keywordQuery = {}
  if (req.query.keyword) {
    if (await isFeatureEnabled('search_v2')) {
      keywordQuery = {
        $or: [
          { name: { $regex: req.query.keyword, $options: 'i' } },
          { brand: { $regex: req.query.keyword, $options: 'i' } },
          { description: { $regex: req.query.keyword, $options: 'i' } },
        ],
      }
    } else {
      keywordQuery = {
        name: { $regex: req.query.keyword, $options: 'i' },
      }
    }
  }

  const filters = {}
  if (await isFeatureEnabled('admin_advanced_filters')) {
    const { priceMin, priceMax, stockMin, stockMax, category, brand } = req.query
    if (priceMin || priceMax) {
      filters.price = {}
      if (priceMin) filters.price.$gte = Number(priceMin)
      if (priceMax) filters.price.$lte = Number(priceMax)
    }
    if (stockMin || stockMax) {
      filters.countInStock = {}
      if (stockMin) filters.countInStock.$gte = Number(stockMin)
      if (stockMax) filters.countInStock.$lte = Number(stockMax)
    }
    if (category) filters.category = category
    if (brand) filters.brand = brand
  }

  const query = { ...keywordQuery, ...filters }
  const count = await Product.countDocuments(query)
  const products = await Product.find(query)
    .limit(pageSize)
    .skip(pageSize * (page - 1))

  res.json({ products, page, pages: Math.ceil(count / pageSize) })
})

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)

  if (!product) {
    res.status(404)
    throw new Error('Product not found')
  }

  if (!(await isFeatureEnabled('verified_purchase_badge'))) {
    return res.json(product)
  }

  // Augment each review with verified flag based on delivered orders containing this product
  const reviewerIds = product.reviews.map((r) => r.user)
  const verifiedOrders = await Order.find({
    user: { $in: reviewerIds },
    isDelivered: true,
    'orderItems.product': product._id,
  }).select('user')
  const verifiedUserIds = new Set(
    verifiedOrders.map((o) => o.user.toString())
  )

  const productObj = product.toObject()
  productObj.reviews = productObj.reviews.map((r) => ({
    ...r,
    verified: verifiedUserIds.has(r.user.toString()),
  }))

  res.json(productObj)
})

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)

  if (product) {
    await product.remove()
    res.json({ message: 'Product removed' })
  } else {
    res.status(404)
    throw new Error('Product not found')
  }
})

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = asyncHandler(async (req, res) => {
  const product = new Product({
    name: 'Sample name',
    price: 0,
    user: req.user._id,
    image: '/images/sample.jpg',
    brand: 'Sample brand',
    category: 'Sample category',
    countInStock: 0,
    numReviews: 0,
    description: 'Sample description',
  })

  const createdProduct = await product.save()
  res.status(201).json(createdProduct)
})

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = asyncHandler(async (req, res) => {
  const {
    name,
    price,
    description,
    image,
    brand,
    category,
    countInStock,
  } = req.body

  const product = await Product.findById(req.params.id)

  if (product) {
    product.name = name
    product.price = price
    product.description = description
    product.image = image
    product.brand = brand
    product.category = category
    product.countInStock = countInStock

    const updatedProduct = await product.save()
    res.json(updatedProduct)
  } else {
    res.status(404)
    throw new Error('Product not found')
  }
})

// @desc    Create new review
// @route   POST /api/products/:id/reviews
// @access  Private
const createProductReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body

  const product = await Product.findById(req.params.id)

  if (product) {
    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    )

    if (alreadyReviewed) {
      res.status(400)
      throw new Error('Product already reviewed')
    }

    const review = {
      name: req.user.name,
      rating: Number(rating),
      comment,
      user: req.user._id,
    }

    if (await isFeatureEnabled('photo_reviews')) {
      const photos = Array.isArray(req.body.photos) ? req.body.photos : []
      review.photos = photos.filter((p) => typeof p === 'string').slice(0, 3)
    }

    product.reviews.push(review)

    product.numReviews = product.reviews.length

    product.rating =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) /
      product.reviews.length

    await product.save()
    res.status(201).json({ message: 'Review added' })
  } else {
    res.status(404)
    throw new Error('Product not found')
  }
})

// @desc    Get top rated products
// @route   GET /api/products/top
// @access  Public
const getTopProducts = asyncHandler(async (req, res) => {
  if (await isFeatureEnabled('product_recommendations')) {
    const products = await Product.aggregate([
      {
        $addFields: {
          score: {
            $multiply: [
              '$rating',
              { $sqrt: { $add: ['$numReviews', 1] } },
            ],
          },
        },
      },
      { $sort: { score: -1 } },
      { $limit: 5 },
    ])
    return res.json(products)
  }
  const products = await Product.find({}).sort({ rating: -1 }).limit(3)
  res.json(products)
})

export {
  getProducts,
  getProductById,
  deleteProduct,
  createProduct,
  updateProduct,
  createProductReview,
  getTopProducts,
}
