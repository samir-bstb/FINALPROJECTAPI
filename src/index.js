// FINALPROJECTAPI/src/index.js
import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';

const app = express();

// ==================== CARGA DE CREDENCIALES FIREBASE ====================
let serviceAccount;

try {
  const firebaseCredentials = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!firebaseCredentials) {
    throw new Error(
      'Falta la variable de entorno FIREBASE_SERVICE_ACCOUNT. Agrégala en Render → Environment → Environment Variables con todo el JSON del service account (en una sola línea).'
    );
  }

  serviceAccount = JSON.parse(firebaseCredentials);
  console.log('Credenciales de Firebase cargadas correctamente desde variable de entorno');
} catch (error) {
  console.error('ERROR FATAL - No se pudieron cargar las credenciales de Firebase:', error.message);
  process.exit(1);
}

// Inicializar Firebase Admin SDK
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('Firebase Admin SDK inicializado correctamente');
} catch (error) {
  console.error('Error inicializando Firebase:', error.message);
  process.exit(1);
}

const db = admin.firestore();

// ==================== CONFIGURACIÓN DE EXPRESS ====================
app.use(cors());
app.use(express.json());

// ==================== RUTA DE PRUEBA ====================
app.get('/', (req, res) => {
  res.send('API de productos y marcas funcionando correctamente - Firebase conectado');
});

// ==================== BRANDS ====================
app.get('/api/brands', async (req, res) => {
  try {
    const snapshot = await db.collection('brands').get();
    const brands = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(brands);
  } catch (e) {
    console.error('Error en GET /api/brands:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/brands/:id', async (req, res) => {
  try {
    const doc = await db.collection('brands').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Brand not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (e) {
    console.error('Error en GET /api/brands/:id:', e);
    res.status(500).json({ error: e.message });
  }
});

// ==================== PRODUCTS ====================
app.get('/api/products', async (req, res) => {
  try {
    let query = db.collection('products');
    const { brandId } = req.query;

    if (brandId) {
      query = query.where('brandId', '==', brandId);
    }

    const snapshot = await query.get();
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(products);
  } catch (e) {
    console.error('Error en GET /api/products:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const doc = await db.collection('products').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Product not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (e) {
    console.error('Error en GET /api/products/:id:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/products/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Parámetro "q" es requerido' });

    const lowercase = q.toLowerCase();
    const snapshot = await db.collection('products').get();
    const results = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(p =>
        p.name.toLowerCase().includes(lowercase) ||
        (p.description && p.description.toLowerCase().includes(lowercase))
      );
    res.json(results);
  } catch (e) {
    console.error('Error en búsqueda:', e);
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
    console.error('Error en productos destacados:', e);
    res.status(500).json({ error: e.message });
  }
});

// ==================== INICIO DEL SERVIDOR ====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API corriendo en el puerto ${PORT}`);
  console.log(`URL: https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'localhost'}:${PORT}`);
});
