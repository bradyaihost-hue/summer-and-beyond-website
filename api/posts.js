const { Client } = require('pg');

const DB_URL = process.env.DATABASE_URL;
const AUTH_TOKEN = process.env.STUDIO_PASSWORD || 'summer2026';

function getClient() {
  return new Client({ connectionString: DB_URL });
}

function unauthorized(res) {
  res.status(401).json({ error: 'Unauthorized' });
}

function checkAuth(req) {
  const auth = req.headers.authorization || '';
  return auth === `Bearer ${AUTH_TOKEN}`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!checkAuth(req)) return unauthorized(res);

  const client = getClient();
  try {
    await client.connect();

    if (req.method === 'GET') {
      const result = await client.query(
        'SELECT * FROM studio_posts ORDER BY saved_at DESC'
      );
      return res.status(200).json(result.rows.map(row => ({
        id: row.id,
        title: row.title,
        template: row.template,
        savedAt: row.saved_at,
        notes: row.notes,
        scheme: row.scheme,
        fields: row.fields,
        photoData: row.photo_data,
        thumbnailDataUrl: row.thumbnail_data_url,
      })));
    }

    if (req.method === 'POST') {
      const { id, title, template, savedAt, notes, scheme, fields, photoData, thumbnailDataUrl } = req.body;
      await client.query(
        `INSERT INTO studio_posts (id, title, template, saved_at, notes, scheme, fields, photo_data, thumbnail_data_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO UPDATE SET
           title=$2, template=$3, saved_at=$4, notes=$5, scheme=$6, fields=$7, photo_data=$8, thumbnail_data_url=$9`,
        [id, title, template, savedAt || new Date().toISOString(), notes || null, scheme || null,
         JSON.stringify(fields || {}), JSON.stringify(photoData || {}), thumbnailDataUrl || null]
      );
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const id = req.url.split('/').pop();
      await client.query('DELETE FROM studio_posts WHERE id = $1', [id]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('DB error:', e.message);
    return res.status(500).json({ error: e.message });
  } finally {
    await client.end();
  }
};
