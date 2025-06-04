# Testing the Lavie API with Swagger and Postman

This guide will help you test the Lavie Water Management System API using both Swagger UI and Postman.

## Part 1: Testing with Swagger UI

### Setup

1. Start the server:
   ```
   npm run dev
   ```

2. Access Swagger UI:
   - Open your browser and navigate to: `http://localhost:5000/api-docs`
   - You'll see the complete API documentation with all endpoints organized by tags

### Testing Workflow

Follow this sequence to properly test the API with Swagger UI:

#### 1. Authentication

1. Expand the Authentication section in Swagger UI
2. Find the POST `/api/auth/login` endpoint and click on it
3. Click "Try it out"
4. Enter the following JSON in the request body:
   ```json
   {
     "username": "admin",
     "password": "password123"
   }
   ```
5. Click "Execute"
6. Check the response - you should receive a 200 status code and a token
7. Copy the token value from the response

For subsequent authenticated requests:
1. Click the "Authorize" button at the top of the page
2. Enter your token in the format: `Bearer your_token_here`
3. Click "Authorize" and close the modal
4. Now all your requests will include the authentication token

#### 2. Creating Basic Data

**Create Products:**
1. Expand the Products section
2. Find the POST `/api/products` endpoint and click on it
3. Click "Try it out"
4. Enter the following JSON in the request body:
   ```json
   {
     "name": "Lavie 19L",
     "unit": "bình",
     "price": 50000,
     "is_returnable": true,
     "stock": 100
   }
   ```
5. Click "Execute"
6. Check the response - you should receive a 201 status code and the created product data
7. Note the product ID for later use

**Create Customers:**
1. Expand the Customers section
2. Find the POST `/api/customers` endpoint and click on it
3. Click "Try it out"
4. Enter the following JSON for a retail customer:
   ```json
   {
     "name": "Retail Customer",
     "type": "retail",
     "phone": "0123456789",
     "address": "123 Main St"
   }
   ```
5. Click "Execute"
6. Check the response - you should receive a 201 status code and the created customer data
7. Note the customer ID for later use

#### 3. Creating Orders and Transactions

**Create Order:**
1. Expand the Orders section
2. Find the POST `/api/orders` endpoint and click on it
3. Click "Try it out"
4. Enter the following JSON, replacing the IDs with the ones you noted earlier:
   ```json
   {
     "customerId": "your_customer_id",
     "orderItems": [
       {
         "productId": "your_product_id",
         "quantity": 3
       }
     ]
   }
   ```
5. Click "Execute"
6. Check the response - you should receive a 201 status code and the created order data
7. Note the order ID for later use

**Create Transaction:**
1. Expand the Transactions section
2. Find the POST `/api/transactions` endpoint and click on it
3. Click "Try it out"
4. Enter the following JSON, replacing the IDs with the ones you noted earlier:
   ```json
   {
     "customerId": "your_customer_id",
     "orderId": "your_order_id",
     "amount": 50000,
     "method": "cash"
   }
   ```
5. Click "Execute"
6. Check the response - you should receive a 201 status code and the created transaction data

#### 4. Checking Reports

1. Expand the Reports section
2. Find the GET `/api/reports/dashboard` endpoint and click on it
3. Click "Try it out"
4. Click "Execute"
5. Check the response - you should receive a 200 status code and dashboard statistics

## Part 2: Testing with Postman

### Setup

1. Import the Postman collection:
   - Open Postman
   - Click "Import" button
   - Select the `Lavie-API-Postman-Collection.json` file
   - Click "Import"

2. Set up environment variables:
   - Click "Environments" in the sidebar
   - Click "+" to create a new environment
   - Name it "Lavie API"
   - Add these variables:
     - `base_url`: `http://localhost:5000`
     - `token`: (leave empty for now)
     - `customer_id`: (leave empty for now)
     - `product_id`: (leave empty for now)
     - `order_id`: (leave empty for now)
   - Click "Save"
   - Select the "Lavie API" environment from the dropdown in the top right

### Testing Workflow

The Postman collection includes helpful scripts that will automatically:
- Save the token after login
- Save the customer ID after creating a customer
- Save the product ID after creating a product
- Save the order ID after creating an order

Follow this sequence to properly test the API with Postman:

1. **Authentication**:
   - Expand the "1. Authentication" folder
   - Run the "Login" request
   - Verify that the token was saved to your environment variables

2. **Create Products**:
   - Expand the "3. Products" folder 
   - Run the "Create Product" request
   - Verify that the product_id was saved to your environment variables

3. **Create Customers**:
   - Expand the "2. Customers" folder
   - Run the "Create Customer (Retail)" request
   - Verify that the customer_id was saved to your environment variables

4. **Create Orders**:
   - Expand the "4. Orders" folder
   - Run the "Create Order" request (this will use your saved customer_id and product_id)
   - Verify that the order_id was saved to your environment variables

5. **Create Transactions**:
   - Expand the "5. Transactions" folder
   - Run the "Create Transaction" request (this will use your saved customer_id and order_id)

6. **Check Reports**:
   - Expand the "6. Reports" folder
   - Run the "Dashboard Stats" request
   - Run the "Sales Report" request

## Error Testing

To test error handling in both Swagger UI and Postman, try:

1. Making requests without authentication
2. Creating a product with the same name (duplicate key error)
3. Creating an order with invalid product IDs
4. Creating a transaction with an amount larger than the order total

## Testing Authentication Levels

1. Create a non-admin user with the "sales" role
2. Try accessing admin-only endpoints (like deleting products)
3. Verify that appropriate authorization errors are returned 