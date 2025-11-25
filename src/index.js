// FINALPROJECTAPI/src/index.js
import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar credenciales de Firebase
const serviceAccount = JSON.parse(
  await readFile(join(__dirname, '../firebase-admin.json'), 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const app = express();

app.use(cors());
app.use(express.json());

// ==================== MESAS ====================
app.get('/tables', async (req, res) => {
  try {
    const snapshot = await db.collection('tables').get();
    const tables = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(tables);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/tables/:id', async (req, res) => {
  try {
    const doc = await db.collection('tables').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/tables/available', async (req, res) => {
  try {
    const { capacity, date, time } = req.query;
    let query = db.collection('tables');
    if (capacity) query = query.where('capacity', '>=', parseInt(capacity));

    const snapshot = await query.get();
    let tables = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (date && time) {
      const resSnap = await db.collection('reservations')
        .where('date', '==', date)
        .where('time', '==', time)
        .get();

      const reservedIds = resSnap.docs.map(d => d.data().tableId);
      tables = tables.filter(t => !reservedIds.includes(t.id));
    }

    res.json(tables);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== RESERVAS ====================
app.get('/reservations', async (req, res) => {
  try {
    const snapshot = await db.collection('reservations').get();
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/reservations', async (req, res) => {
  try {
    const data = {
      ...req.body,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const ref = await db.collection('reservations').add(data);
    res.status(201).json({ id: ref.id, ...data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/reservations/:id', async (req, res) => {
  try {
    await db.collection('reservations').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/', (req, res) => {
  res.send('FINALPROJECTAPI funcionando correctamente');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API corriendo en puerto ${PORT}`);
});