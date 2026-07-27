const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Crear carpeta para uploads si no existe
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB
    fileFilter: (req, file, cb) => {
        // Solo permitir imagenes y PDFs
        const allowedTypes = /jpeg|jpg|png|gif|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes y archivos PDF'));
        }
    }
});

// Base de datos en memoria (simulada)
let mapasDeConocimiento = [
    { id: 1, titulo: 'Introducción a la Programación', descripcion: 'Conceptos básicos', archivo: 'mapa1.pdf', fecha: new Date() },
    { id: 2, titulo: 'Estructuras de Datos', descripcion: 'Arrays, listas, árboles', archivo: 'mapa2.jpg', fecha: new Date() }
];

let nextId = 3;

// ============================================
// RUTAS API REST - CRUD PARA MAPAS DE CONOCIMIENTO
// ============================================

// CREATE - Crear nuevo mapa con archivo adjunto
app.post('/api/mapas', upload.single('archivo'), (req, res) => {
    try {
        const { titulo, descripcion } = req.body;
        
        if (!titulo) {
            return res.status(400).json({ error: 'El título es requerido' });
        }
        
        const nuevoMapa = {
            id: nextId++,
            titulo,
            descripcion: descripcion || '',
            archivo: req.file ? req.file.filename : null,
            rutaArchivo: req.file ? `/uploads/${req.file.filename}` : null,
            fecha: new Date()
        };
        
        mapasDeConocimiento.push(nuevoMapa);
        
        res.status(201).json({
            mensaje: 'Mapa creado exitosamente',
            data: nuevoMapa
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// READ - Obtener todos los mapas
app.get('/api/mapas', (req, res) => {
    res.json({
        total: mapasDeConocimiento.length,
        data: mapasDeConocimiento
    });
});

// READ - Obtener un mapa por ID
app.get('/api/mapas/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const mapa = mapasDeConocimiento.find(m => m.id === id);
    
    if (!mapa) {
        return res.status(404).json({ error: 'Mapa no encontrado' });
    }
    
    res.json({ data: mapa });
});

// UPDATE - Actualizar un mapa existente
app.put('/api/mapas/:id', upload.single('archivo'), (req, res) => {
    const id = parseInt(req.params.id);
    const { titulo, descripcion } = req.body;
    
    const index = mapasDeConocimiento.findIndex(m => m.id === id);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Mapa no encontrado' });
    }
    
    const mapaActualizado = {
        ...mapasDeConocimiento[index],
        titulo: titulo || mapasDeConocimiento[index].titulo,
        descripcion: descripcion || mapasDeConocimiento[index].descripcion,
        archivo: req.file ? req.file.filename : mapasDeConocimiento[index].archivo,
        rutaArchivo: req.file ? `/uploads/${req.file.filename}` : mapasDeConocimiento[index].rutaArchivo,
        fecha: new Date()
    };
    
    mapasDeConocimiento[index] = mapaActualizado;
    
    res.json({
        mensaje: 'Mapa actualizado exitosamente',
        data: mapaActualizado
    });
});

// DELETE - Eliminar un mapa
app.delete('/api/mapas/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = mapasDeConocimiento.findIndex(m => m.id === id);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Mapa no encontrado' });
    }
    
    // Eliminar archivo asociado si existe
    const mapaEliminado = mapasDeConocimiento[index];
    if (mapaEliminado.archivo) {
        const rutaArchivo = path.join(uploadsDir, mapaEliminado.archivo);
        if (fs.existsSync(rutaArchivo)) {
            fs.unlinkSync(rutaArchivo);
        }
    }
    
    mapasDeConocimiento.splice(index, 1);
    
    res.json({ mensaje: 'Mapa eliminado exitosamente' });
});

// ============================================
// SERVICIO DE ARCHIVOS ESTATICOS
// ============================================
app.use('/uploads', express.static(uploadsDir));

// ============================================
// INICIAR SERVIDOR
// ============================================
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Archivos disponibles en http://localhost:${PORT}/uploads`);
    console.log('\nEndpoints disponibles:');
    console.log('POST   /api/mapas          - Crear mapa con archivo');
    console.log('GET    /api/mapas          - Listar todos los mapas');
    console.log('GET    /api/mapas/:id      - Obtener mapa por ID');
    console.log('PUT    /api/mapas/:id      - Actualizar mapa');
    console.log('DELETE /api/mapas/:id      - Eliminar mapa');
});
