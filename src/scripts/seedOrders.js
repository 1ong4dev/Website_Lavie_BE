import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import User from '../models/User.js';
import Customer from '../models/Customer.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    seedOrders();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Seed the orders
async function seedOrders() {
  try {
    // Clear existing orders and order items
    await Order.deleteMany({});
    await OrderItem.deleteMany({});
    console.log('Cleared existing orders and order items');

    // Get products from database
    const products = await Product.find({});
    if (products.length === 0) {
      console.error('No products found in database. Please run seedProducts.js first.');
      process.exit(1);
    }

    // Get or create a default user
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      adminUser = await User.create({
        username: 'admin',
        passwordHash: 'admin123',
        name: 'Admin User',
        role: 'admin'
      });
      console.log('Created admin user');
    }

    // Create or get existing customers
    let customers = await Customer.find({});
    
    if (customers.length === 0) {
      const customerData = [
        {
          name: 'Nguyễn Văn A',
          phone: '0901234567',
          email: 'nguyenvana@example.com',
          address: '123 Đường Lê Lợi, Quận 1, TP.HCM',
          type: 'retail'
        },
        {
          name: 'Trần Thị B',
          phone: '0912345678',
          email: 'tranthib@example.com',
          address: '456 Đường Nguyễn Huệ, Quận 1, TP.HCM',
          type: 'retail'
        },
        {
          name: 'Lê Văn C',
          phone: '0923456789',
          email: 'levanc@example.com',
          address: '789 Đường Cách Mạng Tháng 8, Quận 3, TP.HCM',
          type: 'agency',
          agency_level: 1
        },
        {
          name: 'Phạm Thị D',
          phone: '0934567890',
          email: 'phamthid@example.com',
          address: '101 Đường Võ Văn Tần, Quận 3, TP.HCM',
          type: 'retail'
        },
        {
          name: 'Hoàng Văn E',
          phone: '0945678901',
          email: 'hoangvane@example.com',
          address: '202 Đường Điện Biên Phủ, Quận Bình Thạnh, TP.HCM',
          type: 'agency',
          agency_level: 2
        }
      ];
      
      customers = await Customer.insertMany(customerData);
      console.log(`Created ${customers.length} customers`);
    }

    // Generate random dates within the last 30 days
    const getRandomDate = () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return new Date(thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime()));
    };

    // Generate random statuses with weighted distribution
    const getRandomStatus = () => {
      const statuses = ['completed', 'pending', 'canceled'];
      const weights = [0.6, 0.3, 0.1]; // 60% completed, 30% pending, 10% canceled
      const random = Math.random();
      let sum = 0;
      for (let i = 0; i < weights.length; i++) {
        sum += weights[i];
        if (random < sum) return statuses[i];
      }
      return statuses[0];
    };

    // Create sample orders
    const orderCount = 20;
    const orders = [];
    const orderItems = [];

    for (let i = 0; i < orderCount; i++) {
      // Randomly select a customer
      const customer = customers[Math.floor(Math.random() * customers.length)];
      
      // Create order
      const orderDate = getRandomDate();
      const status = getRandomStatus();
      
      // Generate between 1 and 4 random products for this order
      const orderProductCount = Math.floor(Math.random() * 4) + 1;
      const selectedProducts = [];
      let totalAmount = 0;
      
      // Ensure we don't select the same product twice
      while (selectedProducts.length < orderProductCount) {
        const randomProduct = products[Math.floor(Math.random() * products.length)];
        if (!selectedProducts.some(p => p._id.toString() === randomProduct._id.toString())) {
          selectedProducts.push(randomProduct);
        }
      }
      
      // Calculate total amount and prepare order items
      const orderItemsData = [];
      for (const product of selectedProducts) {
        const quantity = Math.floor(Math.random() * 5) + 1; // 1 to 5 items
        const unitPrice = product.price;
        const total = quantity * unitPrice;
        totalAmount += total;
        
        orderItemsData.push({
          productId: product._id,
          productName: product.name,
          quantity,
          unitPrice,
          total
        });
      }
      
      // Create the order
      const paidAmount = Math.random() > 0.3 ? totalAmount : Math.floor(totalAmount * 0.5); // 70% fully paid, 30% partially paid
      const order = new Order({
        customerId: customer._id,
        customerName: customer.name,
        orderDate,
        status,
        totalAmount,
        paidAmount,
        returnableOut: Math.floor(Math.random() * 3), // 0-2 returnable containers out
        returnableIn: Math.floor(Math.random() * 2), // 0-1 returnable containers in
        createdBy: adminUser._id,
        createdAt: orderDate,
        updatedAt: orderDate
      });
      
      await order.save();
      orders.push(order);
      
      // Create order items for this order
      for (const itemData of orderItemsData) {
        const orderItem = new OrderItem({
          orderId: order._id,
          ...itemData
        });
        
        await orderItem.save();
        orderItems.push(orderItem);
      }
    }

    console.log(`Added ${orders.length} orders with ${orderItems.length} order items to the database`);

    // Close the connection
    mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding orders:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}
