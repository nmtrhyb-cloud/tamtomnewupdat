import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  console.warn('⚠️  JWT_SECRET not set — using a temporary insecure key. Set JWT_SECRET before deploying!');
}
const _JWT_SECRET = JWT_SECRET || `dev-only-${Math.random().toString(36).slice(2)}`;

interface TokenPayload {
  id: string;
  userType: 'customer' | 'driver' | 'admin';
}

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

// Middleware للتحقق من التوكن بشكل عام
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authorization token required' });
  }

  try {
    const decoded = jwt.verify(token, _JWT_SECRET) as TokenPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Middleware للتحقق من نوع المستخدم (مثلاً: المسئولين فقط)
export const authorizeRole = (roles: Array<'customer' | 'driver' | 'admin'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.userType)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
};

// Middleware للتحقق من ملكية البيانات (الوصول لبياناتك الخاصة فقط)
export const authorizeOwnership = (paramName: string = 'id') => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    
    // المديرين يمكنهم الوصول لكل شيء
    if (req.user.userType === 'admin') return next();
    
    const resourceId = req.params[paramName];
    if (req.user.id !== resourceId) {
      return res.status(403).json({ message: 'You can only access your own data' });
    }
    next();
  };
};
