import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

async function findStudentExemptionField() {
  const pdfBytes = fs.readFileSync('./assets/tic-blank.pdf');
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const allFields = form.getFields();

  console.log('Searching for student exemption code field (Enter 1-5)...\n');
  console.log('Looking near Part VII student status section (around YES/NO checkboxes)\n');

  // The YES/NO checkboxes are at Y:663
  // The exemption field should be nearby

  // Check all text fields in the vicinity
  for (const field of allFields) {
    const name = field.getName();
    const type = field.constructor.name;

    if (type !== 'PDFTextField') continue;

    const widgets = (field as any).acroField.getWidgets();
    const rect = widgets[0]?.getRectangle();

    if (!rect) continue;

    // Look for fields on page 2 (recertification page) around the student status area
    // Based on the PDF, Part VII is on page 2
    // Let's check fields with Y between 100 and 700 to cover the whole page

    if (
      rect.y >= 50 &&
      rect.y <= 700 &&
      (name.includes('Enter') ||
        name.includes('1') ||
        name.includes('5') ||
        name === 'undefined' ||
        name.startsWith('fill_'))
    ) {
      console.log(`${name}:`);
      console.log(`  Type: ${type}`);
      console.log(`  Position: X=${rect.x.toFixed(1)}, Y=${rect.y.toFixed(1)}`);
      console.log(`  Size: ${rect.width.toFixed(1)} x ${rect.height.toFixed(1)}`);
      console.log();
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('All fields with "Enter" in the name:');
  console.log('='.repeat(80) + '\n');

  for (const field of allFields) {
    const name = field.getName();
    if (name.toLowerCase().includes('enter')) {
      const widgets = (field as any).acroField.getWidgets();
      const rect = widgets[0]?.getRectangle();
      console.log(`${name}: X=${rect?.x.toFixed(1)}, Y=${rect?.y.toFixed(1)}`);
    }
  }
}

findStudentExemptionField().catch(console.error);
