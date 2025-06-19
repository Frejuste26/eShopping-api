import multer from 'multer';
import path from 'path';

// Configuration du stockage pour Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Déterminer le dossier de destination en fonction du type d'entité (produit, marque, etc.)
    // Pour l'instant, nous allons utiliser un dossier générique 'uploads'
    // Plus tard, cela pourrait être affiné, par exemple req.baseUrl ou un champ spécifique
    cb(null, 'uploads/'); 
  },
  filename: function (req, file, cb) {
    // Générer un nom de fichier unique pour éviter les conflits
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtrage des types de fichiers (accepter uniquement les images)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Seuls les fichiers image sont autorisés!'), false);
  }
};

// Initialisation de Multer avec la configuration de stockage et le filtre de fichiers
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5 // Limite de taille de fichier à 5MB
  }
});

export default upload;