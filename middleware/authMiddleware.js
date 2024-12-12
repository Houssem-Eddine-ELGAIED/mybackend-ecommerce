import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';

// Middleware pour protéger les routes
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Vérifier si le token est présent dans les en-têtes Authorization
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1]; // Extraire le token après "Bearer"
  }

  // Si le token n'est pas trouvé dans les en-têtes, vérifier dans les cookies
  if (!token && req.cookies.jwt) {
    token = req.cookies.jwt; // Récupérer le token des cookies
  }

  // Si aucun token n'est trouvé, renvoyer une erreur
  if (!token) {
    res.status(401).json({ message: 'Token is missing, please provide a valid token.' });
    throw new Error('Token is missing');
  }

  try {
    // Vérifier la validité du token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ajouter l'utilisateur à la requête en excluant le mot de passe
    req.user = await User.findById(decoded.id).select('-password');

    // Continuer vers le prochain middleware ou la route
    next();
  } catch (error) {
    console.error('Token verification failed: ', error);

    // Vérifier si le token est expiré ou invalide
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ message: 'Token has expired, please login again.' });
    } else if (error.name === 'JsonWebTokenError') {
      res.status(401).json({ message: 'Invalid token, please provide a valid token.' });
    } else {
      res.status(401).json({ message: 'Token verification failed, please try again.' });
    }

    throw new Error('Token verification failed');
  }
});

// Middleware pour les routes réservées aux administrateurs
const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next(); // L'utilisateur est un administrateur, on continue
  } else {
    res.status(401).json({ message: 'Not authorized as an admin.' });
    throw new Error('User is not an admin');
  }
}

export { protect, admin };
