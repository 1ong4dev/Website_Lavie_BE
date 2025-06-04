// Helper functions for jsreport templates
export const helpers = {
  // Add one to a value - useful for indexes
  addOne: function(value) { 
    return parseInt(value) + 1; 
  },
  
  // Add a number to a value - useful for indexes in #each loops
  add: function(value, addend) { 
    return parseInt(value) + addend; 
  },
  
  // Format a number with thousand separators
  formatNumber: function(value) { 
    if (value === undefined || value === null) return '0'; 
    return new Intl.NumberFormat('vi-VN').format(value); 
  },
  
  // Format a currency value
  formatCurrency: function(value) { 
    if (value === undefined || value === null) return '0'; 
    return new Intl.NumberFormat('vi-VN').format(value); 
  },
  
  // Format a date
  formatDate: function(date) { 
    if (!date) return 'N/A'; 
    return new Date(date).toLocaleDateString('vi-VN'); 
  },
  
  // Format a date time
  formatDateTime: function(date) { 
    if (!date) return 'N/A'; 
    return new Date(date).toLocaleString('vi-VN'); 
  },
  
  // Get current year
  currentYear: function() { 
    return new Date().getFullYear(); 
  },
  
  // Multiply two numbers
  multiply: function(a, b) { 
    return a * b; 
  },
  
  // Translate order status to Vietnamese
  translateStatus: function(status) { 
    const statusMap = {
      'pending': 'Chờ xử lý', 
      'processing': 'Đang xử lý', 
      'completed': 'Hoàn thành', 
      'cancelled': 'Đã hủy'
    }; 
    return statusMap[status] || status; 
  },
  
  // Compare two values
  equals: function(v1, v2) { 
    return v1 === v2; 
  },
  
  // Greater than comparison
  greaterThan: function(v1, v2) { 
    return v1 > v2; 
  },
  
  // Less than comparison
  lessThan: function(v1, v2) { 
    return v1 < v2; 
  },
  
  // Greater than or equal comparison
  greaterThanOrEqual: function(v1, v2) { 
    return v1 >= v2; 
  },
  
  // Less than or equal comparison
  lessThanOrEqual: function(v1, v2) { 
    return v1 <= v2; 
  },
  
  // JSON stringify for debugging
  json: function(obj) { 
    return JSON.stringify(obj, null, 2); 
  }
};
