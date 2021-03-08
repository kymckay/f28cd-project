const ExcelJS = require('exceljs');

// Mapping party names to EC IDs for later data linkage
// May be a way to do this non-hardcoded, but this is simple for now
const EC_IDs = {
  'Conservative Party': { E: 'PP52', W: 'PP52', S: 'PP52', N: 'PP51' }, // Different ID in NI
  'Conservative': { E: 'PP52', W: 'PP52', S: 'PP52', N: 'PP51' },
  'Liberal Democrats': 'PP90',
  'Liberal Democrat': 'PP90',
  'Labour': 'PP53',
  'Brexit': 'PP7931', // NOTE: Party name has since changed, may not be relevant
  'UKIP': { E: 'PP85', W: 'PP85', S: 'PP85', N: 'PP84' }, // Different ID in NI
  'Green': { E: 'PP63', W: 'PP63', S: 'PP130', N: 'PP305' }, // Different parties in each region under same column
  'SNP': 'PP102',
  'Plaid Cymru': 'PP77',
  'DUP': 'PP70',
  'Sinn Fein': 'PP39',
  'SDLP': 'PP55',
  'UUP': 'PP83',
  'Alliance': 'PP103',
  'Other': 'Other'
}


// Some mappings are simple, some vary by region
function realKey(party, gssId) {
  const mapsTo = EC_IDs[party];
  return (typeof mapsTo === 'string') ? mapsTo : mapsTo[gssId.charAt(0)];
}

exports.readFile = async (filename) => {
  const workbook = new ExcelJS.Workbook();

  await workbook.xlsx.readFile(filename);

  // Can process years in parallel for efficiency
  return Promise.all([
    processYear(workbook, '2019'),
    processYear(workbook, '2017'),
    processYear(workbook, '2015'),
    processYear(workbook, '2010')
  ]);
}

async function processYear(wb, year) {
  const sheet = wb.getWorksheet(year);

  // Object which will hold all data about the year
  const data = { year, constituencies: {} };

  // First get column of each party from row 3 (party name headings)
  const partyCols = {}
  sheet.getRow(3).eachCell((cell, col) => {
    // Heading occupies two merged cells, we want the first column value
    // Excess whitespace can cause key to not match ID mapping object
    partyCols[cell.value.trim()] = col - 1;
  });

  // Now the data can be extracted per constituency (row)
  sheet.eachRow((row, rowNum) => {
    if (rowNum <= 4) return; // Skip heading rows

    // From 2010 onward, column B contains the GSS ID (ONS ID) for all regions
    const gssId = row.getCell(2).value;

    // Skip rows at bottom without data
    if (!(gssId)) return;

    // Extract each parties votes using columns obtained earlier
    const parties = {};
    for (const k in partyCols) {
      const votes = row.getCell(partyCols[k]).value;

      // Not every party runs in every region
      if (votes) {
        parties[realKey(k, gssId)] = votes;
      }
    }

    data.constituencies[gssId] = {
      electorate: row.getCell(7).value, // column 7 always has electorate
      parties
    };
  });

  return data;
}