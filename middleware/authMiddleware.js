import jwt from 'jsonwebtoken'
import asyncHandler from 'express-async-handler'
import User from '../models/userModel.js'

const protect = asyncHandler(async (req, res, next) => {
  let token

  // Check if token exists in cookies (instead of the Authorization header)
  if (req.cookies.jwt) {
    try {
      token = req.cookies.jwt // Get token from cookies

      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      // Fetch user based on decoded token ID (excluding password field)
      req.user = await User.findById(decoded.id).select('-password')

      // Proceed to next middleware/handler
      next()
    } catch (error) {
      console.error(error)
      res.status(401)
      throw new Error('Not authorized, token failed')
    }
  }

  if (!token) {
    res.status(401)
    throw new Error('Not authorized, no token')
  }
})

const admin = (req, res, next) => {
  // Check if the user is an admin
  if (req.user && req.user.isAdmin) {
    next() // User is admin, proceed
  } else {
    res.status(401)
    throw new Error('Not authorized as an admin')
  }
}

export { protect, admin }
