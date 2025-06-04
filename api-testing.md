# Testing the Lavie API with Postman

This guide will walk you through setting up and testing the Lavie Water Management API using Postman.

## Setup

1. First, make sure your Node.js server is running:
   ```
   npm run dev
   ```

2. Import the Postman collection:
   - Open Postman
   - Click "Import" button in the top left
   - Select the `lavie-api-collection.json` file
   - Click "Import"

3. Set up environment variables:
   - Click the "Environment" dropdown in the top right
   - Select "Manage Environments"
   - Click "Add" to create a new environment called "Lavie API"
   - Add the following variables:
     - `base_url`: `http://localhost:5000`
     - `token`: (leave empty for now)
     - `customer_id`: (leave empty for now)
     - `product_id`: (leave empty for now)
     - `order_id`: (leave empty for now)
   - Click "Save"
   - Select the "Lavie API" environment from the dropdown

## Testing Workflow

Follow this sequence to properly test the API:

### 1. Create an Admin User

Since there's no initial user in the database, you'll need to create one using MongoDB directly or by modifying the code to create a default admin user. Here's how to do it via MongoDB:

```javascript
db.users.insertOne({
  username: "admin",
  passwordHash: "$2a$10$8NJQhsJ7kJ/j6c2j3jRcqeDC7k/XsPC6zPyIq0YuQK4O7lZE3kSk.", // "password123"
  role: "admin",
  name: "Admin User",
  createdAt: new Date(),
  updatedAt: new Date()
})
```

### 2. Authenticate and Get Token

1. Open the "1. Authentication > Login" request
2. Update the request body with your admin credentials:
   ```json
   {
     "username": "admin",
     "password": "password123"
   }
   ```
3. Send the request
4. From the response, copy the `token` value
5. Update the environment variable:
   - Click the "Environment" dropdown
   - Click "Edit"
   - Paste the token into the `token` field
   - Click "Save"

### 3. Create Basic Data

#### Create Products

1. Open "3. Products > Create Product" request
2. Send the request with body:
   ```json
   {
     "name": "Lavie 19L",
     "unit": "bình",
     "price": 50000,
     "is_returnable": true,
     "stock": 100
   }
   ```
3. Send the request again with different products:
   ```json
   {
     "name": "Lavie 500ml",
     "unit": "chai",
     "price": 5000,
     "is_returnable": false,
     "stock": 200
   }
   ```
   ```json
   {
     "name": "Thùng rỗng",
     "unit": "thùng",
     "price": 0,
     "is_returnable": false,
     "stock": 50
   }
   ```
4. Open "3. Products > Get All Products" request
5. Send the request to verify your products
6. From the response, copy one of the product IDs and update the `product_id` environment variable

#### Create Customers

1. Open "2. Customers > Create Customer (Retail)" request
2. Send the request
3. Open "2. Customers > Create Customer (Agency)" request
4. Send the request
5. Open "2. Customers > Get All Customers" request
6. Send the request to verify your customers
7. From the response, copy one of the customer IDs and update the `customer_id` environment variable

#### Create a Supplier

1. Open "5. Suppliers > Create Supplier" request
2. Send the request
3. Open "5. Suppliers > Get All Suppliers" request
4. Send the request to verify your supplier

### 4. Create an Order

1. Open "4. Orders > Create Order" request
2. Make sure you have valid `customer_id` and `product_id` in your environment variables
3. Send the request
4. From the response, copy the order ID and update the `order_id` environment variable
5. Open "4. Orders > Get Order by ID" request to verify the order details

### 5. Process Payments

1. Open "6. Transactions > Create Transaction" request
2. Ensure you have valid `customer_id` and `order_id` values
3. Send the request with a payment amount
4. Open "6. Transactions > Get All Transactions" request to verify the transaction
5. Open "4. Orders > Get Order by ID" again to see the updated payment status

### 6. Process Returnable Containers

1. Open "4. Orders > Update Returnable Items" request
2. Ensure you have a valid `order_id`
3. Send the request with some returned quantity
4. Open "4. Orders > Get Order by ID" again to see the updated returnable status

### 7. Check Reports

1. Open "7. Reports > Dashboard Stats" request
2. Send the request to see a summary of your system's data
3. Open "7. Reports > Sales Report" request
4. Send the request to see sales data
5. Open "7. Reports > Debt Report" request
6. Send the request to see customer debt information

## Error Testing

To test error handling, you can try:

1. Creating a product with the same name (should give a duplicate key error)
2. Creating an order with invalid product IDs
3. Creating a transaction with an amount larger than the order total
4. Attempting to return more containers than were initially provided

## Authentication Testing

1. Try making requests without a token or with an invalid token
2. Try accessing admin-only endpoints with a sales user account

## Performance Notes

- The system handles transactions atomically, so if a request fails, the database should not be left in an inconsistent state
- For large datasets, the API includes pagination for listing endpoints
- Report endpoints might be slower as they aggregate data from multiple collections 