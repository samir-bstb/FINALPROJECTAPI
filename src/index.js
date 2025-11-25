// FINALPROJECTAPI/src/index.js
import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';

const app = express();

// ==================== CARGA DE CREDENCIALES FIREBASE ====================
// ESTA ES LA ÚNICA FORMA QUE FUNCIONA BIEN EN RENDER HOY EN DÍA
let serviceAccount;

try {
  const firebaseCredentials = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!firebaseCredentials) {
    throw new Error(
      'Falta la variable de entorno FIREBASE_SERVICE_ACCOUNT. Agrégala en Render → Environment Variables con todo el JSON de tu service account en una sola línea.'
    );
  }

  serviceAccount = JSON.parse(firebaseCredentials);
  console.log('Credenciales de Firebase cargadas correctamente desde variable de entorno');
} catch (error) {
  console.error('ERROR FATAL - No se pudieron cargar las credenciales de Firebase:', error.message);
  process.exit(1); // Fuerza que Render marque el deploy como fallido (así te das cuenta rápido)
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
  res.send('FINALPROJECTAPI funcionando correctamente - Firebase conectado');
});

// ==================== MESAS ====================
app.get('/tables', async (req, res) => {
  try {
    const snapshot = await db.collection('tables').get();
    const tables = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(tables);
  } catch (e) {
    console.error('Error en GET /tables:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/tables/:id', async (req, res) => {
  try {
    const doc = await db.collection('tables').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Mesa no encontrada' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (e) {
    console.error('Error en GET /tables/:id:', e);
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
    console.error('Error en GET /tables/available:', e);
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
    console.error('Error en GET /reservations:', e);
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
    console.error('Error en POST /reservations:', e);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/reservations/:id', async (req, res) => {
  try {
    await db.collection('reservations').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (e) {
    console.error('Error en DELETE /reservations/:id:', e);
    res.status(500).json({ error: e.message });
  }
});

// ==================== INICIO DEL SERVIDOR ====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API corriendo en el puerto ${PORT}`);
  console.log(`URL: https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'localhost'}:${PORT}`);
});
