import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import jsreport from '@jsreport/jsreport-core';
import jsreportChromePdf from '@jsreport/jsreport-chrome-pdf';
import jsreportHandlebars from '@jsreport/jsreport-handlebars';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure templates directory exists
const templatesDir = path.join(__dirname, '../templates');
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
}

// Configure jsreport
export const reporter = jsreport({
  rootDirectory: path.join(__dirname, '../../'),
  logger: {
    console: { transport: 'console', level: 'info' }
  },
  allowLocalFilesAccess: true,
  tempDirectory: path.join(__dirname, '../../temp')
})
  .use(jsreportHandlebars())
  .use(jsreportChromePdf({
    timeout: 30000,
    launchOptions: {
      args: ['--no-sandbox']
    }
  }));

export const initializeJsReport = async () => {
  try {
    await reporter.init();
    console.log('jsreport successfully initialized');
    return reporter;
  } catch (error) {
    console.error('Error initializing jsreport:', error);
    throw error;
  }
};
