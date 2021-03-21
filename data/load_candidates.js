/* eslint-disable no-console */
const fs = require('fs');
const csv = require('@fast-csv/parse');

// Party colours sourced from Wikidata (hardcoded for simplicity, could be queried at runtime)
// Just the most popular that will show on the graph/legend
const colours = {
  'PP52': '#0087DC',
  'PP53': '#DC241F',
  'PP102': '#FFF95D',
  'PP90': '#FAA61A',
  'PP70': '#D46A4C',
  'PP39': '#008800',
  'PP77': '#3F8428',
  'PP55': '#3A9E84',
  'PP63': '#6AB023',
  'PP130': '#62A439',
  'PP305': '#8DC63F',
  'PP103': '#F6CB2F'
}

exports.readFile = async (filename, years, sources) => {
  console.log("Extracting candidate data...");
  // Data from file will be stored in these objects
  const parties = {}; // Political party
  const candidates = []; // Candidate represents a particular campaign

  function processRow(data) {
    // Filter for only parliamentary candidates
    if (data.election.startsWith("parl")) {
      const { name, election_date, gss_code, party_ec_id, party_name, elected } = data;
      const year = election_date.substr(0, 4);

      // Don't care about candidates in unrequested years
      if (years.every(y => y !== year)) return;

      // Store each party once per year they had a candidate (by electoral commision ID)
      // Storing for each year allows quick querying when live
      const partyKey = `${party_ec_id}${year}`;
      if (!parties[partyKey]) {
        parties[partyKey] = {
          party_ec_id,
          party_name,
          year,
          colour: colours[party_ec_id],
          votes: 0, // Party votes will be tallied elsewhere
          predictions: sources.map(() => 0), // Party predictions will be tallied elsewhere
        };
      }

      candidates.push({
        name,
        party_ec_id,
        year,
        gss_code, // identifies constituency ran in
        elected: elected.toLowerCase() === 'true'
      });
    }
  }

  // Returning a promise enables this asynchronous function to work
  return new Promise((resolve, reject) => {
    fs.createReadStream(filename)
      .pipe(csv.parse({ headers: true }))
      .on('error', error => reject(error))
      .on('data', processRow)
      .on('end', () => {
        console.log(`Extracted ${parties.length} party records`);
        console.log(`Extracted ${candidates.length} candidate records`);
        resolve({parties, candidates});
      });
  });
}