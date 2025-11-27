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

// ==================== BRANDS ====================
app.get('/api/brands', async (req, res) => {
  try {
    const snapshot = await db.collection('brands').get();
    const brands = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(brands);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/brands/:id', async (req, res) => {
  try {
    const doc = await db.collection('brands').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Brand not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== PRODUCTS ====================
app.get('/api/products', async (req, res) => {
  try {
    const { brandId } = req.query; // Soporte para ?brandId= (opcional, pero lo incluyo aquí para eficiencia)
    let query = db.collection('products');
    if (brandId) query = query.where('brandId', '==', brandId);
    const snapshot = await query.get();
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const doc = await db.collection('products').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Product not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/products/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query parameter q is required' });
    const lowercaseQuery = q.toLowerCase();
    const snapshot = await db.collection('products').get(); // Nota: Para búsquedas complejas, usa un índice o extensiones como Algolia; esto es básico
    const products = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(product =>
        product.name.toLowerCase().includes(lowercaseQuery) ||
        product.description.toLowerCase().includes(lowercaseQuery)
      );
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/products/featured', async (req, res) => {
  try {
    const snapshot = await db.collection('products')
      .where('rating', '>=', 4.7)
      .orderBy('rating', 'desc')
      .limit(6)
      .get();
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(products);
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
