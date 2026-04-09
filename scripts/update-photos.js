const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_tow7OiYyaq9h@ep-fancy-grass-amfrltpw.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

const photoLibrary = {
  water_heater: ['https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800','https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=800'],
  faucet:       ['https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800','https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800'],
  toilet:       ['https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800','https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=800'],
  pipe:         ['https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800','https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800'],
  roof:         ['https://images.unsplash.com/photo-1632823471565-1ecdf5c6da12?w=800','https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800'],
  gutter:       ['https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800','https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'],
  skylight:     ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800','https://images.unsplash.com/photo-1632823471565-1ecdf5c6da12?w=800'],
  ac:           ['https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800','https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800'],
  thermostat:   ['https://images.unsplash.com/photo-1558449907-7e54d63527ef?w=800','https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800'],
  duct:         ['https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800','https://images.unsplash.com/photo-1558449907-7e54d63527ef?w=800'],
  panel:        ['https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800','https://images.unsplash.com/photo-1558449907-7e54d63527ef?w=800'],
  ceiling_fan:  ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800','https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800'],
  electrical:   ['https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800','https://images.unsplash.com/photo-1558449907-7e54d63527ef?w=800'],
  hardwood:     ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800','https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800'],
  tile:         ['https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800','https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800'],
  flooring:     ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800','https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800'],
  painting:     ['https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800','https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800'],
  cabinet:      ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800','https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800'],
  lawn:         ['https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800','https://images.unsplash.com/photo-1558904541-efa843a96f01?w=800'],
  tree:         ['https://images.unsplash.com/photo-1448375240586-882707db888b?w=800','https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800'],
  landscaping:  ['https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800','https://images.unsplash.com/photo-1558904541-efa843a96f01?w=800'],
  cleaning:     ['https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800','https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=800'],
  pressure:     ['https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800','https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800'],
  fence:        ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800','https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800'],
  window:       ['https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=800','https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800'],
  car:          ['https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800','https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=800'],
  dryer:        ['https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800','https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800'],
  oven:         ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800','https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800'],
  appliance:    ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800','https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800'],
  drywall:      ['https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800','https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800'],
  handyman:     ['https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800','https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800'],
  pest:         ['https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800','https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'],
};

function getPhotos(title, category) {
  const t = (title + ' ' + category).toLowerCase();
  if (t.includes('water heater')) return photoLibrary.water_heater;
  if (t.includes('faucet') || t.includes('drip') || (t.includes('leak') && t.includes('kitchen'))) return photoLibrary.faucet;
  if (t.includes('toilet') || t.includes('flush')) return photoLibrary.toilet;
  if (t.includes('thermostat')) return photoLibrary.thermostat;
  if (t.includes('duct')) return photoLibrary.duct;
  if (t.includes('ac ') || t.includes('ac not') || t.includes('cooling') || t.includes('heat pump')) return photoLibrary.ac;
  if (t.includes('panel') || t.includes('upgrade') && t.includes('electrical')) return photoLibrary.panel;
  if (t.includes('ceiling fan') || t.includes('install fan')) return photoLibrary.ceiling_fan;
  if (t.includes('electric')) return photoLibrary.electrical;
  if (t.includes('hardwood') || t.includes('refinish')) return photoLibrary.hardwood;
  if (t.includes('tile') || t.includes('bathroom floor')) return photoLibrary.tile;
  if (t.includes('cabinet')) return photoLibrary.cabinet;
  if (t.includes('paint')) return photoLibrary.painting;
  if (t.includes('gutter')) return photoLibrary.gutter;
  if (t.includes('skylight')) return photoLibrary.skylight;
  if (t.includes('roof') || t.includes('shingle') || t.includes('leak') && t.includes('roof')) return photoLibrary.roof;
  if (t.includes('lawn') || t.includes('mow') || t.includes('grass') || t.includes('sod') || t.includes('sprinkler')) return photoLibrary.lawn;
  if (t.includes('tree') || t.includes('oak') || t.includes('stump')) return photoLibrary.tree;
  if (t.includes('pressure') || t.includes('power wash') || t.includes('driveway') || t.includes('patio')) return photoLibrary.pressure;
  if (t.includes('window')) return photoLibrary.window;
  if (t.includes('fence') || t.includes('gate')) return photoLibrary.fence;
  if (t.includes('dryer') || t.includes('washer')) return photoLibrary.dryer;
  if (t.includes('oven') || t.includes('stove') || t.includes('range')) return photoLibrary.oven;
  if (t.includes('appliance') || t.includes('fridge') || t.includes('dishwasher')) return photoLibrary.appliance;
  if (t.includes('car') || t.includes('auto') || t.includes('honda') || t.includes('engine') || t.includes('brake') || t.includes('tire') || t.includes('check engine') || t.includes('blowing cold')) return photoLibrary.car;
  if (t.includes('clean') || t.includes('move-in') || t.includes('post-construct')) return photoLibrary.cleaning;
  if (t.includes('drywall') || t.includes('plaster') || t.includes('patch')) return photoLibrary.drywall;
  if (t.includes('pest') || t.includes('ant') || t.includes('roach') || t.includes('termite')) return photoLibrary.pest;
  if (t.includes('handyman') || t.includes('honey-do')) return photoLibrary.handyman;
  // Category fallback
  if (category.includes('plumb')) return photoLibrary.pipe;
  if (category.includes('hvac')) return photoLibrary.ac;
  if (category.includes('electric')) return photoLibrary.electrical;
  if (category.includes('floor')) return photoLibrary.flooring;
  if (category.includes('landscap') || category.includes('lawn')) return photoLibrary.landscaping;
  if (category.includes('roof')) return photoLibrary.roof;
  if (category.includes('clean')) return photoLibrary.cleaning;
  if (category.includes('auto') || category.includes('car')) return photoLibrary.car;
  if (category.includes('appliance')) return photoLibrary.appliance;
  if (category.includes('paint')) return photoLibrary.painting;
  return photoLibrary.handyman;
}

async function run() {
  const { rows } = await pool.query('SELECT id, title, category FROM jobs');
  let updated = 0;
  for (const job of rows) {
    const photos = getPhotos(job.title, job.category);
    await pool.query('UPDATE jobs SET photos = $1 WHERE id = $2', [JSON.stringify(photos), job.id]);
    updated++;
  }
  console.log('Updated', updated, 'jobs');
  pool.end();
}
run().catch(e => { console.error(e.message); pool.end(); });
