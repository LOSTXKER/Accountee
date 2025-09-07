// scripts/find-pdf-fields.js
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function getPdfFields() {
  try {
    const pdfPath = path.join(process.cwd(), 'public', 'approve_wh3_081156.pdf');
    console.log(`Reading PDF from: ${pdfPath}`);

    if (!fs.existsSync(pdfPath)) {
      console.error('Error: PDF file not found at the specified path.');
      console.error('Please make sure "approve_wh3_081156.pdf" is in the "public" directory.');
      return;
    }

    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    if (fields.length === 0) {
        console.log('No fillable fields found in this PDF. It might not be a form, or the fields are not standard AcroForm fields.');
        return;
    }

    console.log('--- Discovered PDF Fields ---');
    fields.forEach(field => {
      const type = field.constructor.name;
      const name = field.getName();
      console.log(`- Name: "${name}", Type: ${type}`);
    });
    console.log('-----------------------------');
    console.log('\nPlease copy the list of field names above and provide it to me.');

  } catch (error) {
    console.error('An error occurred:', error);
  }
}

getPdfFields();
