import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import dotenv from 'dotenv';

import Customer from '../models/Customer.js';

dotenv.config();
export const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } 
  // Check for token in query parameters
  else if (req.query.token) {
    token = req.query.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-passwordHash');
      next();
      return; // Important to return here to prevent the code below from executing
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  // If no token found in either place
  return res.status(401).json({ message: 'Not authorized, no token' });
};

export const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as admin' });
  }
};

export const sales = (req, res, next) => {
  if (req.user && (req.user.role === 'sales' || req.user.role === 'admin' )) {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as sales' });
  }
};
// only put this in put customer route
export const updateCustomerMiddleware = async (req, res, next) => {
  if (req.user && (req.user.role === 'sales' || req.user.role === 'admin' )) {
    next();
  } 
  else if( req.user && req.user.role === 'customer') {
    const customer = await Customer.findOne({userId: req.user._id});
    if(req.params.id === customer._id.toString()) {
    next();
    }
  }
  else {
    res.status(401).json({ message: 'Not authorized as sales' });
  }
};

export const delivery = (req, res, next) => {
  if (req.user && (req.user.role === 'delivery' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as delivery' });
  }
}; 