"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const path = __importStar(require("path"));
const otpController_1 = __importDefault(require("../controllers/otpController"));
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
const otpController = new otpController_1.default();
// Lazy initialization of Firebase Admin
let firebaseApp = null;
const initFirebase = () => {
    if (!firebaseApp && (0, app_1.getApps)().length === 0) {
        try {
            let serviceAccount = null;
            if (process.env.FIREBASE_SERVICE_ACCOUNT) {
                try {
                    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
                }
                catch {
                    serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8'));
                }
            }
            else {
                const p = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
                const absolutePath = path.resolve(process.cwd(), p);
                serviceAccount = require(absolutePath);
            }
            firebaseApp = (0, app_1.initializeApp)({
                credential: (0, app_1.cert)(serviceAccount)
            });
            logger_1.default.info('Firebase Admin initialized');
        }
        catch (error) {
            logger_1.default.error('Failed to initialize Firebase Admin', error);
            throw error;
        }
    }
    return firebaseApp || (0, app_1.getApps)()[0];
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
            decodedToken = await (0, auth_1.getAuth)(app).verifyIdToken(idToken);
        }
        catch (error) {
            return res.status(401).json({ error: 'Invalid idToken' });
        }
        // Set custom claims
        await (0, auth_1.getAuth)(app).setCustomUserClaims(decodedToken.uid, { otpVerified: true });
        res.status(200).json({ success: true, message: 'OTP verified and account activated' });
    }
    catch (error) {
        logger_1.default.error('Failed to verify OTP and claim', error.message);
        res.status(400).json({ error: error.message });
    }
});
exports.default = router;
