import InventoryLog from '../models/InventoryLog.js';
import Product from '../models/Product.js';

// @desc    Get all inventory logs
// @route   GET /api/inventory
// @access  Private/Admin
export const getInventoryLogs = async (req, res) => {
  try {
    const logs = await InventoryLog.find({})
      .sort({ date: -1 })
      .populate('productId', 'name');
    
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get inventory logs by product
// @route   GET /api/inventory/product/:id
// @access  Private/Admin
export const getInventoryLogsByProduct = async (req, res) => {
  try {
    const logs = await InventoryLog.find({ productId: req.params.id })
      .sort({ date: -1 });
    
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create inventory log manually
// @route   POST /api/inventory
// @access  Private/Admin
export const createInventoryLog = async (req, res) => {
  try {
    const { productId, type, quantity, note } = req.body;

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Update product stock based on log type
    if (type === 'import') {
      product.stock += quantity;
    } else if (type === 'export' || type === 'return') {
      if (product.stock < quantity) {
        return res.status(400).json({ message: 'Insufficient stock' });
      }
      product.stock -= quantity;
    }

    await product.save();

    // Create inventory log
    const log = await InventoryLog.create({
      productId,
      type,
      quantity,
      note,
    });

    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get inventory report
// @route   GET /api/inventory/report
// @access  Private/Admin
export const getInventoryReport = async (req, res) => {
  try {
    const products = await Product.find({});
    
    const report = await Promise.all(products.map(async (product) => {
      const imports = await InventoryLog.aggregate([
        { $match: { productId: product._id, type: 'import' } },
        { $group: { _id: null, total: { $sum: '$quantity' } } },
      ]);
      
      const exports = await InventoryLog.aggregate([
        { $match: { productId: product._id, type: 'export' } },
        { $group: { _id: null, total: { $sum: '$quantity' } } },
      ]);
      
      const returns = await InventoryLog.aggregate([
        { $match: { productId: product._id, type: 'return' } },
        { $group: { _id: null, total: { $sum: '$quantity' } } },
      ]);
      
      return {
        product: {
          _id: product._id,
          name: product.name,
          currentStock: product.stock,
        },
        totalImported: imports.length > 0 ? imports[0].total : 0,
        totalExported: exports.length > 0 ? exports[0].total : 0,
        totalReturned: returns.length > 0 ? returns[0].total : 0,
      };
    }));
    
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get inventory report by date range
// @route   GET /api/inventory/report/date
// @access  Private/Admin
export const getInventoryReportByDate = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Vui lòng cung cấp ngày bắt đầu và ngày kết thúc' });
    }
    
    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Set to end of day
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Định dạng ngày không hợp lệ' });
    }
    
    // Get all products
    const products = await Product.find({});
    
    // Get inventory logs within date range
    const inventoryLogs = await InventoryLog.find({
      date: { $gte: start, $lte: end }
    }).populate('productId', 'name');
    
    // Group logs by product and type
    const logsByProduct = {};
    
    inventoryLogs.forEach(log => {
      const productId = log.productId._id.toString();
      
      if (!logsByProduct[productId]) {
        logsByProduct[productId] = {
          productId: productId,
          productName: log.productId.name,
          import: 0,
          export: 0,
          return: 0,
          logs: []
        };
      }
      
      logsByProduct[productId][log.type] += log.quantity;
      logsByProduct[productId].logs.push({
        date: log.date,
        type: log.type,
        quantity: log.quantity,
        note: log.note
      });
    });
    
    // Calculate current stock for each product
    const report = products.map(product => {
      const productId = product._id.toString();
      const productLogs = logsByProduct[productId] || {
        productId,
        productName: product.name,
        import: 0,
        export: 0,
        return: 0,
        logs: []
      };
      
      return {
        productId,
        productName: product.name,
        currentStock: product.stock,
        stockMovements: {
          import: productLogs.import,
          export: productLogs.export,
          return: productLogs.return
        },
        netChange: productLogs.import - productLogs.export + productLogs.return,
        logs: productLogs.logs.sort((a, b) => new Date(b.date) - new Date(a.date))
      };
    });
    
    res.json({
      startDate: start,
      endDate: end,
      products: report
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Export inventory report by date range as PDF
// @route   GET /api/inventory/report/date/export
// @access  Private/Admin
export const exportInventoryReportByDate = async (req, res) => {
  try {
    const { startDate, endDate, token } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Vui lòng cung cấp ngày bắt đầu và ngày kết thúc' });
    }
    
    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Set to end of day
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Định dạng ngày không hợp lệ' });
    }
    
    // Get all products
    const products = await Product.find({});
    
    // Get inventory logs within date range
    const inventoryLogs = await InventoryLog.find({
      date: { $gte: start, $lte: end }
    }).populate('productId', 'name');
    
    // Group logs by product and type
    const logsByProduct = {};
    
    inventoryLogs.forEach(log => {
      const productId = log.productId._id.toString();
      
      if (!logsByProduct[productId]) {
        logsByProduct[productId] = {
          productId: productId,
          productName: log.productId.name,
          import: 0,
          export: 0,
          return: 0
        };
      }
      
      logsByProduct[productId][log.type] += log.quantity;
    });
    
    // Calculate current stock for each product
    const reportData = products.map(product => {
      const productId = product._id.toString();
      const productLogs = logsByProduct[productId] || {
        productId,
        productName: product.name,
        import: 0,
        export: 0,
        return: 0
      };
      
      return {
        productName: product.name,
        currentStock: product.stock,
        import: productLogs.import,
        export: productLogs.export,
        return: productLogs.return,
        netChange: productLogs.import - productLogs.export + productLogs.return
      };
    });
    
    // Generate PDF report
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=inventory-report-${startDate}-to-${endDate}.pdf`);
    
    // Pipe the PDF to the response
    doc.pipe(res);
    
    // Add report title
    doc.fontSize(16).text('Báo Cáo Tồn Kho', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Từ ngày: ${new Date(start).toLocaleDateString('vi-VN')}`, { align: 'center' });
    doc.fontSize(12).text(`Đến ngày: ${new Date(end).toLocaleDateString('vi-VN')}`, { align: 'center' });
    doc.moveDown();
    
    // Add table headers
    const tableTop = 150;
    const tableLeft = 50;
    const colWidths = [200, 70, 70, 70, 70, 70];
    
    doc.font('Helvetica-Bold');
    doc.text('Sản phẩm', tableLeft, tableTop);
    doc.text('Tồn kho', tableLeft + colWidths[0], tableTop);
    doc.text('Nhập', tableLeft + colWidths[0] + colWidths[1], tableTop);
    doc.text('Xuất', tableLeft + colWidths[0] + colWidths[1] + colWidths[2], tableTop);
    doc.text('Trả', tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], tableTop);
    doc.text('Thay đổi', tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], tableTop);
    
    // Add table rows
    doc.font('Helvetica');
    let rowTop = tableTop + 20;
    
    reportData.forEach((item, index) => {
      // Add a new page if needed
      if (rowTop > 700) {
        doc.addPage();
        rowTop = 50;
        
        // Add table headers to new page
        doc.font('Helvetica-Bold');
        doc.text('Sản phẩm', tableLeft, rowTop);
        doc.text('Tồn kho', tableLeft + colWidths[0], rowTop);
        doc.text('Nhập', tableLeft + colWidths[0] + colWidths[1], rowTop);
        doc.text('Xuất', tableLeft + colWidths[0] + colWidths[1] + colWidths[2], rowTop);
        doc.text('Trả', tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], rowTop);
        doc.text('Thay đổi', tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], rowTop);
        doc.font('Helvetica');
        rowTop += 20;
      }
      
      // Add alternating row background
      if (index % 2 === 1) {
        doc.rect(tableLeft, rowTop - 5, colWidths.reduce((a, b) => a + b, 0), 20).fill('#f5f5f5');
        doc.fillColor('black');
      }
      
      doc.text(item.productName, tableLeft, rowTop);
      doc.text(item.currentStock.toString(), tableLeft + colWidths[0], rowTop);
      doc.text(item.import.toString(), tableLeft + colWidths[0] + colWidths[1], rowTop);
      doc.text(item.export.toString(), tableLeft + colWidths[0] + colWidths[1] + colWidths[2], rowTop);
      doc.text(item.return.toString(), tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], rowTop);
      doc.text(item.netChange.toString(), tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], rowTop);
      
      rowTop += 20;
    });
    
    // Add summary
    doc.moveDown(2);
    doc.fontSize(12).text(`Tổng số sản phẩm: ${reportData.length}`, { align: 'left' });
    
    // Finalize the PDF
    doc.end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};