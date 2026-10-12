import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

async function extractFields() {
  const pdfBytes = fs.readFileSync('./assets/tic-blank.pdf');
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  console.log(`Total fields: ${fields.length}\n`);

  const fieldData: Array<{
    name: string;
    type: string;
    page: number | null;
    rect: string | null;
  }> = [];

  for (const field of fields) {
    const name = field.getName();
    const type = field.constructor.name;

    // Get the first widget (field appearance) to find page and position
    const widgets = (field as any).acroField.getWidgets();
    const firstWidget = widgets[0];

    let pageNum: number | null = null;
    let rect: string | null = null;

    if (firstWidget) {
      // Find which page this widget is on
      const pages = pdfDoc.getPages();
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        if (!page) continue;
        const pageAnnots = page.node.Annots();
        if (pageAnnots) {
          const annots = pageAnnots.asArray();
          for (const annot of annots) {
            if (annot === firstWidget.dict) {
              pageNum = i + 1; // 1-indexed
              break;
            }
          }
        }
        if (pageNum !== null) break;
      }

      // Get rectangle position
      const rectArray = firstWidget.getRectangle();
      if (rectArray) {
        rect = `[${rectArray.x.toFixed(1)}, ${rectArray.y.toFixed(1)}, ${rectArray.width.toFixed(1)}, ${rectArray.height.toFixed(1)}]`;
      }
    }

    fieldData.push({ name, type, page: pageNum, rect });
  }

  // Sort by page, then by Y coordinate (top to bottom), then X coordinate (left to right)
  fieldData.sort((a, b) => {
    if (a.page !== b.page) {
      return (a.page || 0) - (b.page || 0);
    }
    if (a.rect && b.rect) {
      const aParts = a.rect.split(',');
      const bParts = b.rect.split(',');
      const aY = parseFloat(aParts[1] || '0');
      const bY = parseFloat(bParts[1] || '0');
      if (Math.abs(aY - bY) > 5) { // Same row if within 5 points
        return bY - aY; // Higher Y first (PDF coords are bottom-up)
      }
      const aX = parseFloat((aParts[0] || '[0').substring(1));
      const bX = parseFloat((bParts[0] || '[0').substring(1));
      return aX - bX;
    }
    return 0;
  });

  // Print organized output
  let currentPage = 0;
  for (const field of fieldData) {
    if (field.page !== currentPage) {
      currentPage = field.page || 0;
      console.log(`\n${'='.repeat(80)}`);
      console.log(`PAGE ${currentPage}`);
      console.log('='.repeat(80));
    }
    console.log(`Name: ${field.name}`);
    console.log(`Type: ${field.type}`);
    console.log(`Rect: ${field.rect || 'N/A'}`);
    console.log('-'.repeat(80));
  }

  // Output as JSON for easier parsing
  fs.writeFileSync(
    './scripts/pdf-fields.json',
    JSON.stringify(fieldData, null, 2)
  );

  console.log(`\n✓ Field data written to scripts/pdf-fields.json`);
}

extractFields().catch(console.error);
