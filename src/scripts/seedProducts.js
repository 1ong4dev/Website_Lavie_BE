import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';

// Load environment variables
dotenv.config();

// Sample product data with the provided image URLs
const productData = [
  {
    name: 'Nước khoáng Lavie 18.5L bình vòi',
    unit: 'bình',
    price: 85000,
    is_returnable: true,
    stock: 100,
    image: 'https://giaonuocthuduc.com/wp-content/uploads/2023/12/nuoc-khoang-lavie-18.5l-binh-voi.webp',
    description: 'Nước khoáng Lavie 18.5L bình vòi tiện lợi cho gia đình và văn phòng'
  },
  {
    name: 'Nước khoáng Lavie 350ml',
    unit: 'chai',
    price: 5000,
    is_returnable: false,
    stock: 500,
    image: 'https://www.laviewater.com/media/catalog/product/cache/26875f483b01c23ee90703c4af2b98ce/3/5/350ml.png',
    description: 'Nước khoáng thiên nhiên Lavie 350ml tiện lợi mang theo'
  },
  {
    name: 'Nước khoáng Lavie 350ml (thùng)',
    unit: 'thùng',
    price: 120000,
    is_returnable: false,
    stock: 50,
    image: 'https://nuoctinhkhiet.com/wp-content/uploads/Lavie-350ml-2.jpg',
    description: 'Thùng 24 chai nước khoáng Lavie 350ml'
  },
  {
    name: 'Nước khoáng Lavie 19L',
    unit: 'bình',
    price: 75000,
    is_returnable: true,
    stock: 80,
    image: 'https://nuocsatori.com/wp-content/uploads/2021/09/nuoc-khoang-lavie-19l.jpg',
    description: 'Nước khoáng Lavie bình 19L dùng cho máy nóng lạnh'
  },
  {
    name: 'Nước khoáng Lavie 500ml',
    unit: 'chai',
    price: 6500,
    is_returnable: false,
    stock: 400,
    image: 'https://sonhawater.com/wp-content/uploads/2019/09/lavie-500ml.png',
    description: 'Nước khoáng thiên nhiên Lavie 500ml dạng chai'
  }
];

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    seedProducts();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Seed the products
async function seedProducts() {
  try {
    // Clear existing products
    await Product.deleteMany({});
    console.log('Cleared existing products');

    // Insert new products
    const insertedProducts = await Product.insertMany(productData);
    console.log(`Added ${insertedProducts.length} products to the database`);

    // Close the connection
    mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding products:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}
