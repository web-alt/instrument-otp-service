import { Router } from 'express';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as path from 'path';
import OtpController from '../controllers/otpController';
import logger from '../utils/logger';

const router = Router();
const otpController = new OtpController();

// Lazy initialization of Firebase Admin
let firebaseApp: App | null = null;
const initFirebase = () => {
  if (!firebaseApp && getApps().length === 0) {
    try {
      let serviceAccount: any = null;
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
          serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        } catch {
          serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8'));
        }
      } else {
        const p = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
        const absolutePath = path.resolve(process.cwd(), p);
        serviceAccount = require(absolutePath);
      }
      firebaseApp = initializeApp({
        credential: cert(serviceAccount)
      });
      logger.info('Firebase Admin initialized');
    } catch (error) {
      logger.error('Failed to initialize Firebase Admin', error);
      throw error;
    }
  }
  return firebaseApp || getApps()[0];
};

/**
 * Route to verify OTP and set custom claims
 */
router.post('/otp/verify-and-claim', async (req, res) => {
  try {
    const { email, otp, idToken } = req.body;

    if (!email || !otp || !idToken) {
      return res.status(400).json({ error: 'email, otp, and idToken are required' });
    }

    // Verify OTP using the controller
    await otpController.verifyOtp(email, otp?.toString());

    // Initialize Firebase and verify token
    const app = initFirebase();
    let decodedToken;
    try {
      decodedToken = await getAuth(app).verifyIdToken(idToken);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid idToken' });
    }

    // Set custom claims
    await getAuth(app).setCustomUserClaims(decodedToken.uid, { otpVerified: true });

    res.status(200).json({ success: true, message: 'OTP verified and account activated' });
  } catch (error) {
    logger.error('Failed to verify OTP and claim', (error as Error).message);
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;
