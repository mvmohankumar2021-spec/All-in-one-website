// Exact strings intentionally retained, not counted as translated copy.
// Do not add ordinary UI instructions here to hide a coverage failure.
const preserved = {};
const retain = (reason, strings) => strings.forEach(text => { preserved[text] = reason; });
retain('Brand or product name', ['SHAKALPA','Shakalpa','SHAGRAM','Shagram','SHAKALPA Shagram','ShaBox','ShaBox | SHAKALPA','Facebook','Instagram','WhatsApp','WHATSAPP','GOOGLE MAPS','© 2026 SHAKALPA']);
retain('Published contact destination; preserve digits', ['WhatsApp +91 93443 83825','WhatsApp +91 99441 14752']);
retain('Market index or exchange name', ['BSE','NSE','NIFTY 50','SENSEX','Sensex']);
retain('Blood group notation', ['AB+','AB-']);
retain('Standard control abbreviation', ['AC','SOS']);
retain('Example identifier or calculator syntax', ['#NH-2048','ABCD12345E','ans','average(10, 20, 30)']);
retain('Example clock time; no words requiring translation', ['11:00 AM','2:00 PM','4:30 PM','9:30 AM']);
retain('Demo person or location name', ['Greenwich','Market St.','Maya Rios','Riverside']);
retain('Catalogue film or series title, retained as a proper name', ['A Place to Begin','Blue Hour','Five Minutes of Rain','Lines of Work','Makers of Tomorrow','Our Sunday Table','Paper Boats','Roommates','Second Coffee','The Last Train Home','The Little Orchard']);
module.exports = preserved;
