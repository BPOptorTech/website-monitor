"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const authController_1 = require("../controllers/authController");
const validateRequest_1 = require("../middleware/validateRequest");
const router = express_1.default.Router();
// Registration validation
const registerValidation = [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    (0, express_validator_1.body)('first_name').trim().isLength({ min: 1 }).withMessage('First name is required'),
    (0, express_validator_1.body)('last_name').trim().isLength({ min: 1 }).withMessage('Last name is required'),
];
// Login validation
const loginValidation = [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password is required'),
];
router.post('/register', registerValidation, validateRequest_1.validateRequest, authController_1.register);
router.post('/login', loginValidation, validateRequest_1.validateRequest, authController_1.login);
exports.default = router;
//# sourceMappingURL=auth.js.map