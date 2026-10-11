module.exports = function requireAuth(req, res, next){
  if (req.session && req.session.userId) return next();
  res.status(401).json({ error: 'Tu sesión expiró. Vuelve a iniciar sesión.' });
};
