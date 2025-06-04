# Lavie Water Management System API Documentation

## Base URL
```
http://localhost:5000
```

## Authentication
All API endpoints (except login) require authentication using JWT Bearer token.

Add the following header to your requests:
```
Authorization: Bearer {your_token}
```

---

## 1. Authentication Endpoints

### Login
- **URL**: `/api/auth/login`
- **Method**: `POST`
- **Auth Required**: No
- **Body**:
```json
{
  "username": "admin",
  "password": "your_password"
}
```
- **Success Response**: Returns user data and JWT token
```json
{
  "_id": "user_id",
  "name": "User Name",
  "username": "admin",
  "role": "admin",
  "token": "your_jwt_token"
}
```

### Register New User (Admin only)
- **URL**: `/api/auth/register`
- **Method**: `POST`
- **Auth Required**: Yes (Admin)
- **Body**:
```json
{
  "username": "newuser",
  "password": "password123",
  "name": "New User",
  "role": "sales"
}
```
- **Success Response**: Returns created user data and token
```json
{
  "_id": "user_id",
  "name": "New User",
  "username": "newuser",
  "role": "sales",
  "token": "jwt_token"
}
```

### Get User Profile
- **URL**: `/api/auth/profile`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: Returns user profile data
```json
{
  "_id": "user_id",
  "name": "User Name",
  "username": "admin",
  "role": "admin"
}
```

---

## 2. Customer Endpoints

### Get All Customers
- **URL**: `/api/customers`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: Returns array of customers
```json
[
  {
    "_id": "customer_id",
    "name": "Customer Name",
    "type": "retail",
    "phone": "0123456789",
    "address": "Customer Address",
    "debt": 0,
    "empty_debt": 0,
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
]
```

### Get Customer by ID
- **URL**: `/api/customers/:id`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: Returns customer data
```json
{
  "_id": "customer_id",
  "name": "Customer Name",
  "type": "retail",
  "phone": "0123456789",
  "address": "Customer Address",
  "debt": 0,
  "empty_debt": 0,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Create Customer
- **URL**: `/api/customers`
- **Method**: `POST`
- **Auth Required**: Yes (Admin/Sales)
- **Body**:
```json
{
  "name": "New Customer",
  "type": "retail",
  "phone": "0123456789",
  "address": "Customer Address"
}
```
OR for agency type:
```json
{
  "name": "Agency Customer",
  "type": "agency",
  "phone": "0123456789",
  "address": "Customer Address",
  "agency_level": 1
}
```
- **Success Response**: Returns created customer data

### Update Customer
- **URL**: `/api/customers/:id`
- **Method**: `PUT`
- **Auth Required**: Yes (Admin/Sales)
- **Body**: Include only fields that need to be updated
```json
{
  "name": "Updated Name",
  "phone": "9876543210",
  "address": "Updated Address"
}
```
- **Success Response**: Returns updated customer data

### Delete Customer
- **URL**: `/api/customers/:id`
- **Method**: `DELETE`
- **Auth Required**: Yes (Admin)
- **Success Response**:
```json
{
  "message": "Customer removed"
}
```

---

## 3. Product Endpoints

### Get All Products
- **URL**: `/api/products`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: Returns array of products
```json
[
  {
    "_id": "product_id",
    "name": "Lavie 19L",
    "unit": "bình",
    "price": 50000,
    "is_returnable": true,
    "stock": 100,
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
]
```

### Get Product by ID
- **URL**: `/api/products/:id`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: Returns product data
```json
{
  "_id": "product_id",
  "name": "Lavie 19L",
  "unit": "bình",
  "price": 50000,
  "is_returnable": true,
  "stock": 100,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Create Product
- **URL**: `/api/products`
- **Method**: `POST`
- **Auth Required**: Yes (Admin)
- **Body**:
```json
{
  "name": "Lavie 500ml",
  "unit": "chai",
  "price": 5000,
  "is_returnable": false,
  "stock": 200
}
```
- **Success Response**: Returns created product data

### Update Product
- **URL**: `/api/products/:id`
- **Method**: `PUT`
- **Auth Required**: Yes (Admin)
- **Body**: Include only fields that need to be updated
```json
{
  "price": 52000,
  "stock": 150
}
```
- **Success Response**: Returns updated product data

### Delete Product
- **URL**: `/api/products/:id`
- **Method**: `DELETE`
- **Auth Required**: Yes (Admin)
- **Success Response**:
```json
{
  "message": "Product removed"
}
```

### Update Product Stock
- **URL**: `/api/products/:id/stock`
- **Method**: `PUT`
- **Auth Required**: Yes (Admin)
- **Body**:
```json
{
  "quantity": 120
}
```
- **Success Response**: Returns updated product data

---

## 4. Order Endpoints

### Get All Orders
- **URL**: `/api/orders`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: Returns array of orders
```json
[
  {
    "_id": "order_id",
    "customerId": "customer_id",
    "customerName": "Customer Name",
    "orderDate": "timestamp",
    "status": "pending",
    "totalAmount": 150000,
    "paidAmount": 0,
    "debtRemaining": 150000,
    "returnableOut": 3,
    "returnableIn": 0,
    "createdBy": "user_id",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
]
```

### Get Order by ID
- **URL**: `/api/orders/:id`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: Returns order data with items
```json
{
  "_id": "order_id",
  "customerId": "customer_id",
  "customerName": "Customer Name",
  "orderDate": "timestamp",
  "status": "pending",
  "totalAmount": 150000,
  "paidAmount": 0,
  "debtRemaining": 150000,
  "returnableOut": 3,
  "returnableIn": 0,
  "createdBy": "user_id",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "items": [
    {
      "_id": "item_id",
      "orderId": "order_id",
      "productId": "product_id",
      "productName": "Lavie 19L",
      "quantity": 3,
      "unitPrice": 50000,
      "total": 150000
    }
  ]
}
```

### Create Order
- **URL**: `/api/orders`
- **Method**: `POST`
- **Auth Required**: Yes (Sales)
- **Body**:
```json
{
  "customerId": "customer_id",
  "orderItems": [
    {
      "productId": "product_id_1",
      "quantity": 3
    },
    {
      "productId": "product_id_2",
      "quantity": 5
    }
  ]
}
```
- **Success Response**: Returns created order data

### Update Order Status
- **URL**: `/api/orders/:id/status`
- **Method**: `PUT`
- **Auth Required**: Yes (Sales)
- **Body**:
```json
{
  "status": "completed"
}
```
- **Success Response**: Returns updated order data

### Update Returnable Items
- **URL**: `/api/orders/:id/returnable`
- **Method**: `PUT`
- **Auth Required**: Yes (Sales)
- **Body**:
```json
{
  "returnedQuantity": 2
}
```
- **Success Response**: Returns updated order data

### Update Payment
- **URL**: `/api/orders/:id/payment`
- **Method**: `PUT`
- **Auth Required**: Yes (Sales)
- **Body**:
```json
{
  "amount": 50000
}
```
- **Success Response**: Returns updated order data

---

## 5. Supplier Endpoints

### Get All Suppliers
- **URL**: `/api/suppliers`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: Returns array of suppliers
```json
[
  {
    "_id": "supplier_id",
    "name": "Supplier Name",
    "contact_person": "Contact Person",
    "phone": "0123456789",
    "email": "supplier@example.com",
    "address": "Supplier Address",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
]
```

### Get Supplier by ID
- **URL**: `/api/suppliers/:id`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: Returns supplier data
```json
{
  "_id": "supplier_id",
  "name": "Supplier Name",
  "contact_person": "Contact Person",
  "phone": "0123456789",
  "email": "supplier@example.com",
  "address": "Supplier Address",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Create Supplier
- **URL**: `/api/suppliers`
- **Method**: `POST`
- **Auth Required**: Yes (Admin)
- **Body**:
```json
{
  "name": "New Supplier",
  "contact_person": "Contact Person",
  "phone": "0123456789",
  "email": "supplier@example.com",
  "address": "Supplier Address"
}
```
- **Success Response**: Returns created supplier data

### Update Supplier
- **URL**: `/api/suppliers/:id`
- **Method**: `PUT`
- **Auth Required**: Yes (Admin)
- **Body**: Include only fields that need to be updated
```json
{
  "phone": "9876543210",
  "email": "updated@example.com"
}
```
- **Success Response**: Returns updated supplier data

### Delete Supplier
- **URL**: `/api/suppliers/:id`
- **Method**: `DELETE`
- **Auth Required**: Yes (Admin)
- **Success Response**:
```json
{
  "message": "Supplier removed"
}
```

---

## 6. Transaction Endpoints

### Get All Transactions
- **URL**: `/api/transactions`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: Returns array of transactions
```json
[
  {
    "_id": "transaction_id",
    "customerId": {
      "_id": "customer_id",
      "name": "Customer Name"
    },
    "orderId": {
      "_id": "order_id",
      "orderDate": "timestamp"
    },
    "date": "timestamp",
    "amount": 50000,
    "method": "cash",
    "createdBy": "user_id"
  }
]
```

### Get Transaction by ID
- **URL**: `/api/transactions/:id`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: Returns transaction data
```json
{
  "_id": "transaction_id",
  "customerId": {
    "_id": "customer_id",
    "name": "Customer Name"
  },
  "orderId": {
    "_id": "order_id",
    "orderDate": "timestamp"
  },
  "date": "timestamp",
  "amount": 50000,
  "method": "cash",
  "createdBy": "user_id"
}
```

### Create Transaction
- **URL**: `/api/transactions`
- **Method**: `POST`
- **Auth Required**: Yes (Sales)
- **Body**:
```json
{
  "customerId": "customer_id",
  "orderId": "order_id",
  "amount": 50000,
  "method": "cash"
}
```
- **Success Response**: Returns created transaction data

### Get Transactions by Customer
- **URL**: `/api/transactions/customer/:id`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: Returns array of customer's transactions
```json
[
  {
    "_id": "transaction_id",
    "customerId": "customer_id",
    "orderId": {
      "_id": "order_id",
      "orderDate": "timestamp"
    },
    "date": "timestamp",
    "amount": 50000,
    "method": "cash",
    "createdBy": "user_id"
  }
]
```

---

## 7. Empty Return Endpoints

### Get All Empty Returns
- **URL**: `/api/returns`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: Returns array of empty returns
```json
[
  {
    "_id": "return_id",
    "customerId": {
      "_id": "customer_id",
      "name": "Customer Name"
    },
    "orderId": {
      "_id": "order_id",
      "orderDate": "timestamp"
    },
    "date": "timestamp",
    "delivered": 3,
    "returned": 2,
    "note": "Return note"
  }
]
```

### Get Empty Return by ID
- **URL**: `/api/returns/:id`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: Returns empty return data
```json
{
  "_id": "return_id",
  "customerId": {
    "_id": "customer_id",
    "name": "Customer Name"
  },
  "orderId": {
    "_id": "order_id",
    "orderDate": "timestamp"
  },
  "date": "timestamp",
  "delivered": 3,
  "returned": 2,
  "note": "Return note"
}
```

### Create Empty Return
- **URL**: `/api/returns`
- **Method**: `POST`
- **Auth Required**: Yes (Sales)
- **Body**:
```json
{
  "customerId": "customer_id",
  "orderId": "order_id",
  "delivered": 0,
  "returned": 2,
  "note": "Customer returned 2 empty bottles"
}
```
- **Success Response**: Returns created empty return data

### Get Empty Returns by Customer
- **URL**: `/api/returns/customer/:id`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: Returns array of customer's empty returns
```json
[
  {
    "_id": "return_id",
    "customerId": "customer_id",
    "orderId": {
      "_id": "order_id",
      "orderDate": "timestamp"
    },
    "date": "timestamp",
    "delivered": 3,
    "returned": 2,
    "note": "Return note"
  }
]
```

---

## 8. Import Endpoints

### Get All Imports
- **URL**: `/api/imports`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: Returns array of imports
```json
[
  {
    "_id": "import_id",
    "supplierId": "supplier_id",
    "supplierName": "Supplier Name",
    "importDate": "timestamp",
    "totalAmount": 1000000,
    "createdBy": "user_id",
    "note": "Import note",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
]
```

### Get Import by ID
- **URL**: `/api/imports/:id`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: Returns import data with items
```json
{
  "_id": "import_id",
  "supplierId": "supplier_id",
  "supplierName": "Supplier Name",
  "importDate": "timestamp",
  "totalAmount": 1000000,
  "createdBy": "user_id",
  "note": "Import note",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "items": [
    {
      "_id": "item_id",
      "importId": "import_id",
      "productId": "product_id",
      "productName": "Lavie 19L",
      "quantity": 20,
      "unitPrice": 50000,
      "total": 1000000
    }
  ]
}
```

### Create Import
- **URL**: `/api/imports`
- **Method**: `POST`
- **Auth Required**: Yes (Admin)
- **Body**:
```json
{
  "supplierId": "supplier_id",
  "importItems": [
    {
      "productId": "product_id_1",
      "quantity": 20,
      "unitPrice": 50000
    }
  ],
  "note": "Monthly import"
}
```
- **Success Response**: Returns created import data

### Delete Import
- **URL**: `/api/imports/:id`
- **Method**: `DELETE`
- **Auth Required**: Yes (Admin)
- **Success Response**:
```json
{
  "message": "Import removed"
}
```

---

## 9. Inventory Endpoints

### Get All Inventory Logs
- **URL**: `/api/inventory`
- **Method**: `GET`
- **Auth Required**: Yes (Admin)
- **Success Response**: Returns array of inventory logs
```json
[
  {
    "_id": "log_id",
    "productId": {
      "_id": "product_id",
      "name": "Lavie 19L"
    },
    "date": "timestamp",
    "type": "import",
    "quantity": 20,
    "note": "Import from Supplier"
  }
]
```

### Create Inventory Log
- **URL**: `/api/inventory`
- **Method**: `POST`
- **Auth Required**: Yes (Admin)
- **Body**:
```json
{
  "productId": "product_id",
  "type": "import",
  "quantity": 10,
  "note": "Manual stock adjustment"
}
```
- **Success Response**: Returns created log data

### Get Inventory Report
- **URL**: `/api/inventory/report`
- **Method**: `GET`
- **Auth Required**: Yes (Admin)
- **Success Response**: Returns inventory report
```json
[
  {
    "product": {
      "_id": "product_id",
      "name": "Lavie 19L",
      "currentStock": 100
    },
    "totalImported": 150,
    "totalExported": 50,
    "totalReturned": 0
  }
]
```

### Get Inventory Logs by Product
- **URL**: `/api/inventory/product/:id`
- **Method**: `GET`
- **Auth Required**: Yes (Admin)
- **Success Response**: Returns product's inventory logs
```json
[
  {
    "_id": "log_id",
    "productId": "product_id",
    "date": "timestamp",
    "type": "import",
    "quantity": 20,
    "note": "Import from Supplier"
  }
]
```

---

## 10. Report Endpoints

### Get Sales Report
- **URL**: `/api/reports/sales`
- **Method**: `GET`
- **Auth Required**: Yes (Admin)
- **Query Parameters** (optional):
  - `startDate`: Start date (YYYY-MM-DD)
  - `endDate`: End date (YYYY-MM-DD)
- **Success Response**: Returns sales report
```json
{
  "period": {
    "start": "timestamp",
    "end": "timestamp"
  },
  "summary": {
    "totalSales": 3500000,
    "totalPaid": 3000000,
    "totalDebt": 500000,
    "orderCount": 25
  },
  "salesByCustomerType": [
    {
      "_id": "retail",
      "total": 1500000,
      "count": 15
    },
    {
      "_id": "agency",
      "total": 2000000,
      "count": 10
    }
  ]
}
```

### Get Inventory Report
- **URL**: `/api/reports/inventory`
- **Method**: `GET`
- **Auth Required**: Yes (Admin)
- **Success Response**: Returns inventory report
```json
{
  "summary": {
    "totalProducts": 5,
    "totalInventoryValue": 5000000,
    "lowStockCount": 1,
    "outOfStockCount": 0
  },
  "lowStockProducts": [
    {
      "_id": "product_id",
      "name": "Lavie 19L",
      "stock": 5,
      "price": 50000
    }
  ],
  "outOfStockProducts": []
}
```

### Get Debt Report
- **URL**: `/api/reports/debt`
- **Method**: `GET`
- **Auth Required**: Yes (Admin)
- **Success Response**: Returns debt report
```json
{
  "summary": {
    "totalDebt": 2500000,
    "customersWithDebtCount": 12,
    "totalEmptyDebt": 45,
    "customersWithEmptyDebtCount": 8
  },
  "customersWithDebt": [
    {
      "_id": "customer_id",
      "name": "Customer Name",
      "debt": 500000
    }
  ],
  "customersWithEmptyDebt": [
    {
      "_id": "customer_id",
      "name": "Customer Name",
      "empty_debt": 10
    }
  ]
}
```

### Get Dashboard Stats
- **URL**: `/api/reports/dashboard`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: Returns dashboard statistics
```json
{
  "sales": {
    "today": 250000,
    "month": 3500000,
    "todayOrderCount": 3,
    "monthOrderCount": 25
  },
  "customers": {
    "total": 50
  },
  "payments": {
    "today": 200000
  },
  "inventory": {
    "lowStockCount": 1
  },
  "debt": {
    "total": 2500000
  }
}
``` 