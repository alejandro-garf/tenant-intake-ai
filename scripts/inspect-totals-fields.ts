import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

/**
 * Detailed inspection of total and calculation fields in the TIC form.
 * This script examines fields by position to identify which field holds which total.
 */

async function inspectFields() {
  const pdfBytes = fs.readFileSync('./assets/tic-blank.pdf');
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  console.log('PART III - INCOME SECTION TOTALS');
  console.log('='.repeat(80));
  console.log('Looking for fields in the totals row (Y ~401) and total income (Y ~220-260)\n');

  // Fields we suspect are totals based on Y position
  const suspectTotalsFields = [
    'fill_122', // Y: 401.3
    'fill_123', // Y: 401.3
    'fill_124', // Y: 401.3
    'fill_125', // Y: 401.3
    'fill_130', // Y: 220.7 (likely TOTAL INCOME E or L)
  ];

  for (const fieldName of suspectTotalsFields) {
    try {
      const field = form.getTextField(fieldName);
      const widgets = (field as any).acroField.getWidgets();
      const rect = widgets[0]?.getRectangle();

      console.log(`Field: ${fieldName}`);
      console.log(`  Position: X=${rect?.x.toFixed(1)}, Y=${rect?.y.toFixed(1)}`);
      console.log(`  Size: W=${rect?.width.toFixed(1)}, H=${rect?.height.toFixed(1)}`);

      // Based on X position, determine which column this likely is
      if (rect) {
        if (rect.x >= 80 && rect.x < 150) {
          console.log(`  → Likely: Column A (Employment/Wages) total`);
        } else if (rect.x >= 200 && rect.x < 260) {
          console.log(`  → Likely: Column B (Soc Security/Pensions) total`);
        } else if (rect.x >= 330 && rect.x < 380) {
          console.log(`  → Likely: Column C (Public Assistance) total`);
        } else if (rect.x >= 440 && rect.x < 500) {
          console.log(`  → Likely: Column D (Other Income) total`);
        } else if (rect.x >= 450 && rect.y < 240) {
          console.log(`  → Likely: TOTAL INCOME (E) or (L) based on position`);
        }
      }
      console.log();
    } catch (e) {
      console.log(`Field: ${fieldName} - NOT FOUND OR NOT A TEXT FIELD`);
      console.log();
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('PART IV - ASSETS SECTION TOTALS AND CALCULATIONS');
  console.log('='.repeat(80));
  console.log(
    'Looking for: H total, I total, J (imputed), K (greater of I or J), L (E+K)\n'
  );

  const suspectAssetFields = [
    'fill_127', // Y: 261.2
    'fill_128', // Y: 261.2
    'Enter 15', // Y: 253.2 (asset imputation entry)
    'fill_129', // Y: 236.2
    'fill_130', // Y: 220.7
    'fill_132', // Y: 184.4
    'undefined', // Y: 241.3
  ];

  for (const fieldName of suspectAssetFields) {
    try {
      const field = form.getTextField(fieldName);
      const widgets = (field as any).acroField.getWidgets();
      const rect = widgets[0]?.getRectangle();

      console.log(`Field: ${fieldName}`);
      console.log(`  Position: X=${rect?.x.toFixed(1)}, Y=${rect?.y.toFixed(1)}`);
      console.log(`  Size: W=${rect?.width.toFixed(1)}, H=${rect?.height.toFixed(1)}`);

      // Determine what this field likely is based on position
      if (rect) {
        if (rect.y >= 260 && rect.y < 265) {
          // Top row of totals
          if (rect.x >= 295 && rect.x < 350) {
            console.log(`  → Likely: Column H TOTAL (Total Cash Value)`);
          } else if (rect.x >= 450 && rect.x < 500) {
            console.log(`  → Likely: Column I TOTAL (Total Annual Income from Assets)`);
          }
        } else if (rect.y >= 250 && rect.y < 260) {
          console.log(`  → Likely: Passbook rate entry or imputation input`);
        } else if (rect.y >= 230 && rect.y < 245) {
          console.log(`  → Likely: (J) Imputed Income OR (K) Total Income from Assets`);
        } else if (rect.y >= 220 && rect.y < 230) {
          console.log(`  → Likely: (K) Total Income from Assets OR (L) Total Annual Income`);
        } else if (rect.y >= 180 && rect.y < 200) {
          console.log(`  → Likely: (L) Total Annual Household Income from all Sources`);
        }
      }
      console.log();
    } catch (e) {
      console.log(`Field: ${fieldName} - NOT FOUND OR NOT A TEXT FIELD`);
      console.log();
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('PART VII - STUDENT STATUS');
  console.log('='.repeat(80));
  console.log('Looking for all-student household Yes/No and exemption code fields\n');

  // Search for fields that might be student status related
  const allFields = form.getFields();
  const studentRelatedFields = allFields.filter((f) => {
    const name = f.getName().toLowerCase();
    return (
      name.includes('student') ||
      name.includes('yes') ||
      name.includes('no') ||
      name === 'YES' ||
      name === 'NO'
    );
  });

  console.log(`Found ${studentRelatedFields.length} student-related fields:\n`);

  for (const field of studentRelatedFields) {
    const name = field.getName();
    const type = field.constructor.name;
    const widgets = (field as any).acroField.getWidgets();
    const rect = widgets[0]?.getRectangle();

    console.log(`Field: ${name}`);
    console.log(`  Type: ${type}`);
    console.log(`  Position: X=${rect?.x.toFixed(1)}, Y=${rect?.y.toFixed(1)}`);

    // The YES/NO checkboxes around Y:663 are likely the Part VII question
    if (rect && rect.y >= 660 && rect.y <= 670) {
      console.log(`  → LIKELY PART VII: All-student household question`);
    }
    console.log();
  }

  // Look for numeric fields that might hold exemption code 1-5
  console.log('\nSearching for exemption code entry field (1-5):');
  const numericFields = ['1', '2', '3', '4', '5', '6', '7', 'Enter 15'];

  for (const fieldName of numericFields) {
    try {
      const field = form.getField(fieldName);
      const widgets = (field as any).acroField.getWidgets();
      const rect = widgets[0]?.getRectangle();

      if (rect && rect.y >= 50 && rect.y <= 70) {
        // Near bottom, likely demographic initials
        console.log(`  ${fieldName}: Demographic initials (Y=${rect.y.toFixed(1)}) - SKIP`);
      } else {
        console.log(`  ${fieldName}: Y=${rect?.y.toFixed(1)}, X=${rect?.x.toFixed(1)}`);
      }
    } catch (e) {
      // Field not found
    }
  }
}

inspectFields().catch(console.error);
