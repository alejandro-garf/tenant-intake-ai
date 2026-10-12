import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

async function findPartVIIExemption() {
  const pdfBytes = fs.readFileSync('./assets/tic-blank.pdf');
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();

  console.log(`PDF has ${pages.length} pages\n`);

  // Read page 2 as an image to see the layout
  console.log('Examining all fields on the PDF to find Part VII exemption code field...\n');
  console.log('We know:');
  console.log('- YES checkbox is at X=502.8, Y=663.3');
  console.log('- NO checkbox is at X=533.9, Y=663.2');
  console.log('- The exemption code field should be near these checkboxes\n');
  console.log('Looking for text fields in the Y range 650-670 (near YES/NO):\n');

  const form = pdfDoc.getForm();
  const allFields = form.getFields();

  for (const field of allFields) {
    const name = field.getName();
    const type = field.constructor.name;

    if (type !== 'PDFTextField') continue;

    const widgets = (field as any).acroField.getWidgets();
    const rect = widgets[0]?.getRectangle();

    if (!rect) continue;

    // Look for fields near the YES/NO checkboxes (Y ~663)
    if (rect.y >= 650 && rect.y <= 680) {
      console.log(`${name}:`);
      console.log(`  Position: X=${rect.x.toFixed(1)}, Y=${rect.y.toFixed(1)}`);
      console.log(`  Size: ${rect.width.toFixed(1)} x ${rect.height.toFixed(1)}`);
      console.log();
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('Based on the PDF form instructions, Part VII asks:');
  console.log('"ARE ALL OCCUPANTS FULL TIME STUDENTS?"');
  console.log('□ Yes    □ No');
  console.log('If yes, Enter student explanation* 1-5  [Enter box here]');
  console.log('='.repeat(80) + '\n');

  console.log('The "Enter 1-5" field is likely a small box to the RIGHT of the YES/NO');
  console.log('Looking for fields with X > 540 (to the right of NO checkbox) and Y ~663:\n');

  for (const field of allFields) {
    const name = field.getName();
    const type = field.constructor.name;

    if (type !== 'PDFTextField') continue;

    const widgets = (field as any).acroField.getWidgets();
    const rect = widgets[0]?.getRectangle();

    if (!rect) continue;

    // To the right of NO checkbox
    if (rect.x >= 540 && rect.y >= 650 && rect.y <= 680) {
      console.log(`${name}:`);
      console.log(`  Position: X=${rect.x.toFixed(1)}, Y=${rect.y.toFixed(1)}`);
      console.log(`  Size: ${rect.width.toFixed(1)} x ${rect.height.toFixed(1)}`);
      console.log(`  → LIKELY: Part VII student exemption code field`);
      console.log();
    }
  }

  console.log('\nIf no fields found above, the exemption code field might be:');
  console.log('1. A field with an auto-generated name like undefined_X or fill_X');
  console.log('2. Located on page 2, which may have different coordinate system');
  console.log('\nLet me check all small fields (width < 50) near YES/NO height:\n');

  for (const field of allFields) {
    const name = field.getName();
    const type = field.constructor.name;

    if (type !== 'PDFTextField') continue;

    const widgets = (field as any).acroField.getWidgets();
    const rect = widgets[0]?.getRectangle();

    if (!rect) continue;

    // Small fields near the student status section
    if (rect.width < 60 && rect.y >= 655 && rect.y <= 670) {
      console.log(`${name}:`);
      console.log(`  Position: X=${rect.x.toFixed(1)}, Y=${rect.y.toFixed(1)}`);
      console.log(`  Size: ${rect.width.toFixed(1)} x ${rect.height.toFixed(1)}`);
      console.log();
    }
  }
}

findPartVIIExemption().catch(console.error);
