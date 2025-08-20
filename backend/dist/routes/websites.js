"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const websiteController_1 = require("../controllers/websiteController");
const auth_1 = require("../middleware/auth");
const validateRequest_1 = require("../middleware/validateRequest");
const router = express_1.default.Router();
// Validation rules for adding a website
const addWebsiteValidation = [
    (0, express_validator_1.body)('name').trim().isLength({ min: 1 }).withMessage('Website name is required'),
    (0, express_validator_1.body)('url').isURL().withMessage('Please provide a valid URL'),
];
// POST /api/websites - Add a new website
router.post('/', auth_1.authenticateToken, addWebsiteValidation, validateRequest_1.validateRequest, websiteController_1.createWebsite);
exports.default = router;
//# sourceMappingURL=websites.js.map