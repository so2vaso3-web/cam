// OCR Service for CCCD extraction
// Supports multiple OCR providers: Tesseract.js (local), Google Vision API, or custom API

const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

// OCR Configuration
const OCR_CONFIG = {
    provider: process.env.OCR_PROVIDER || 'tesseract', // 'tesseract', 'google', 'custom'
    language: 'vie+eng', // Vietnamese + English
    tesseractOptions: {
        lang: 'vie+eng',
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ /-.,:',
    }
};

// Extract CCCD info from image using Tesseract.js
async function extractCCCDInfoTesseract(imagePath) {
    try {
        const { data: { text } } = await Tesseract.recognize(imagePath, OCR_CONFIG.language, {
            logger: m => console.log(m)
        });

        // Parse CCCD information from text
        const cccdInfo = parseCCCDText(text);
        return {
            success: true,
            data: cccdInfo,
            raw_text: text,
            confidence: 0.85, // Tesseract doesn't provide confidence per field
            provider: 'tesseract'
        };
    } catch (error) {
        console.error('Tesseract OCR error:', error);
        return {
            success: false,
            error: error.message,
            provider: 'tesseract'
        };
    }
}

// Parse CCCD text to extract structured data
function parseCCCDText(text) {
    const info = {
        cccd_number: null,
        full_name: null,
        date_of_birth: null,
        address: null,
        issue_date: null,
        issue_place: null
    };

    // Extract CCCD number (12 digits)
    const cccdMatch = text.match(/\b\d{12}\b/);
    if (cccdMatch) {
        info.cccd_number = cccdMatch[0];
    }

    // Extract name (usually after "Họ và tên" or "Họ tên")
    const nameMatch = text.match(/(?:Họ\s+và\s+tên|Họ\s+tên)[:\s]+([A-ZÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ\s]+)/i);
    if (nameMatch) {
        info.full_name = nameMatch[1].trim();
    }

    // Extract date of birth (DD/MM/YYYY format)
    const dobMatch = text.match(/(?:Ngày\s+sinh|Sinh\s+ngày)[:\s]+(\d{2}\/\d{2}\/\d{4})/i);
    if (dobMatch) {
        info.date_of_birth = dobMatch[1];
    }

    // Extract address
    const addressMatch = text.match(/(?:Địa\s+chỉ|Nơi\s+thường\s+trú)[:\s]+(.+?)(?:\n|$)/i);
    if (addressMatch) {
        info.address = addressMatch[1].trim();
    }

    // Extract issue date
    const issueDateMatch = text.match(/(?:Ngày\s+cấp|Cấp\s+ngày)[:\s]+(\d{2}\/\d{2}\/\d{4})/i);
    if (issueDateMatch) {
        info.issue_date = issueDateMatch[1];
    }

    // Extract issue place
    const issuePlaceMatch = text.match(/(?:Nơi\s+cấp|Cấp\s+tại)[:\s]+(.+?)(?:\n|$)/i);
    if (issuePlaceMatch) {
        info.issue_place = issuePlaceMatch[1].trim();
    }

    return info;
}

// Extract CCCD info using Google Vision API
async function extractCCCDInfoGoogle(imagePath) {
    // Requires Google Cloud Vision API key
    const vision = require('@google-cloud/vision');
    const client = new vision.ImageAnnotatorClient({
        keyFilename: process.env.GOOGLE_VISION_KEY_FILE || './google-vision-key.json'
    });

    try {
        const [result] = await client.textDetection(imagePath);
        const detections = result.textAnnotations;
        
        if (detections.length === 0) {
            return {
                success: false,
                error: 'No text detected',
                provider: 'google'
            };
        }

        const fullText = detections[0].description;
        const cccdInfo = parseCCCDText(fullText);

        // Calculate confidence from detection scores
        const confidence = detections.slice(1).reduce((sum, d) => sum + (d.score || 0), 0) / (detections.length - 1);

        return {
            success: true,
            data: cccdInfo,
            raw_text: fullText,
            confidence: confidence || 0.9,
            provider: 'google'
        };
    } catch (error) {
        console.error('Google Vision API error:', error);
        return {
            success: false,
            error: error.message,
            provider: 'google'
        };
    }
}

// Main OCR extraction function
async function extractCCCDInfo(imagePath, provider = null) {
    const ocrProvider = provider || OCR_CONFIG.provider;

    switch (ocrProvider) {
        case 'google':
            return await extractCCCDInfoGoogle(imagePath);
        case 'tesseract':
        default:
            return await extractCCCDInfoTesseract(imagePath);
    }
}

// Save OCR data to database
function saveOCRData(db, userId, cccdInfo, imagePaths, ocrResult) {
    return new Promise((resolve, reject) => {
        const {
            cccd_number,
            full_name,
            date_of_birth,
            address,
            issue_date,
            issue_place
        } = cccdInfo;

        // Check if CCCD number already exists (anti-fake)
        if (cccd_number) {
            db.get(
                'SELECT user_id FROM kyc_data WHERE cccd_number = ? AND user_id != ?',
                [cccd_number, userId],
                (err, existing) => {
                    if (err) {
                        return reject(err);
                    }
                    if (existing) {
                        return reject(new Error('CCCD number already registered to another account'));
                    }

                    // Insert or update KYC data
                    insertKYCData();
                }
            );
        } else {
            insertKYCData();
        }

        function insertKYCData() {
            db.run(
                `INSERT OR REPLACE INTO kyc_data 
                 (user_id, cccd_number, full_name, date_of_birth, address, issue_date, issue_place,
                  cccd_front_path, cccd_back_path, face_video_path, face_photo_path,
                  ocr_data, ocr_confidence, verification_status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    cccd_number,
                    full_name,
                    date_of_birth,
                    address,
                    issue_date,
                    issue_place,
                    imagePaths.cccd_front,
                    imagePaths.cccd_back,
                    imagePaths.face_video,
                    imagePaths.face_photo,
                    JSON.stringify(ocrResult),
                    ocrResult.confidence || 0,
                    'pending'
                ],
                function(err) {
                    if (err) {
                        return reject(err);
                    }

                    // Update user table with CCCD number
                    db.run(
                        `UPDATE users SET 
                         cccd_number = ?, 
                         cccd_name = ?,
                         cccd_dob = ?,
                         cccd_address = ?,
                         kyc_completed = 1
                         WHERE id = ?`,
                        [cccd_number, full_name, date_of_birth, address, userId],
                        (err) => {
                            if (err) {
                                return reject(err);
                            }
                            resolve({
                                kyc_id: this.lastID,
                                cccd_info: cccdInfo
                            });
                        }
                    );
                }
            );
        }
    });
}

module.exports = {
    extractCCCDInfo,
    saveOCRData,
    parseCCCDText,
    OCR_CONFIG
};

