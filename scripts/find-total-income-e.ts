import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

async function findTotalIncomeE() {
  const pdfBytes = fs.readFileSync('./assets/tic-blank.pdf');
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  console.log('Searching for TOTAL INCOME (E) field...\n');
  console.log('This should be below the column totals (Y~401) but above assets (Y<400)\n');

  for (const field of fields) {
    const name = field.getName();
    const type = field.constructor.name;

    if (type !== 'PDFTextField') continue;

    const widgets = (field as any).acroField.getWidgets();
    const rect = widgets[0]?.getRectangle();

    if (!rect) continue;

    // Look for fields between the column totals and the asset section
    if (rect.y >= 380 && rect.y <= 415 && rect.x >= 400) {
      console.log(`${name}:`);
      console.log(`  Position: X=${rect.x.toFixed(1)}, Y=${rect.y.toFixed(1)}`);
      console.log(`  Size: ${rect.width.toFixed(1)} x ${rect.height.toFixed(1)}`);
      console.log();
    }
  }
}

findTotalIncomeE().catch(console.error);
