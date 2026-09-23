/**
 * Utility for open-source OCR text processing and UPI / Bank Transaction ID & Amount extraction.
 * Uses Google ML Kit Text Recognition on Android/iOS and Tesseract.js for Web browser runtimes.
 * Single-pass recognition extracts both Transaction ID and Amount Paid together.
 * Supports PhonePe, Google Pay, Paytm, Amazon Pay, Super.Money, BHIM, PayZapp, CRED, and Bank Apps.
 */
import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";

const EXCLUDED_WORDS = new Set([
  "TRANSACTION", "SUCCESSFUL", "SUCCESS", "COMPLETED", "FAILED",
  "PAYMENT", "RECEIPT", "GOOGLE", "PHONEPE", "PAYTM", "BANK",
  "DEBITED", "CREDITED", "AMOUNT", "TOTAL", "STATUS", "DETAILS",
  "TRANSFER", "ACCOUNT", "INDIAN", "RUPEES", "INR", "PAID", "DONE",
  "ETERNIA", "FLATS", "WELFARE", "ASSOCIATION", "POWERED", "PAYZAPP",
  "SAVINGS", "MESSAGE", "USING", "CANARA", "AMAZON", "BHIM", "CRED",
  "HDFC", "ICICI", "AXIS", "KOTAK", "YONO", "SBIN", "MOBILE", "SUPER",
  "MONEY", "NAVI", "REFERENCE", "ERENCE", "ERENCEID"
]);

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000, lakh: 100000,
  lakhs: 100000, crore: 10000000, crores: 10000000
};

export interface ExtractedPaymentDetails {
  txnId: string | null;
  amount: number | null;
  rawText?: string;
}

/**
 * Parses English words in payment receipt text to extract numeric amount (e.g. "Two Thousand Eight Hundred Rupees" -> 2800).
 */
export function parseAmountFromWords(text: string): number | null {
  if (!text) return null;

  const wordRegex = /(?:Rupees\s+)?((?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|lakh|lakhs|\s)+)(?:\s+Rupees|\s+Only)?/gi;

  let match: RegExpExecArray | null;
  while ((match = wordRegex.exec(text)) !== null) {
    if (match[1]) {
      const words = match[1].toLowerCase().trim().split(/\s+/);
      if (words.length >= 1) {
        let total = 0;
        let current = 0;
        let valid = false;

        for (const w of words) {
          if (NUMBER_WORDS[w] !== undefined) {
            valid = true;
            const val = NUMBER_WORDS[w];
            if (val === 100) {
              current = (current === 0 ? 1 : current) * 100;
            } else if (val >= 1000) {
              total += (current === 0 ? 1 : current) * val;
              current = 0;
            } else {
              current += val;
            }
          }
        }
        total += current;

        if (valid && total >= 10 && total <= 500000) {
          return total;
        }
      }
    }
  }

  return null;
}

/**
 * Sanitizes candidate transaction IDs, stripping concatenated adjacent text while preserving full PhonePe IDs (e.g. "T2609211739314825672066").
 */
export function cleanExtractedTxnId(rawCandidate: string): string {
  if (!rawCandidate) return "";

  let clean = rawCandidate.replace(/[\s\-]/g, "").trim();

  // Strip leading leftover label text (e.g. "erenceID626462916810" -> "626462916810")
  clean = clean.replace(/^(?:erence|reference|transaction|txn|ref|upi|id)+/i, "");

  // 1. Full PhonePe Transaction ID (starts with T followed by 18 to 24 digits e.g. T2609211739314825672066)
  const phonePeMatch = clean.match(/^T\d{18,24}/i);
  if (phonePeMatch) {
    return phonePeMatch[0];
  }

  // 2. Truncate at known payment receipt stop keywords
  const stopWordRegex = /(Paid|Using|Bank|RRN|Amt|Amount|Date|Time|Message|Status|Completed|Successful|Debited)/i;
  const stopIndex = clean.search(stopWordRegex);
  if (stopIndex > 0) {
    clean = clean.substring(0, stopIndex);
  }

  // 3. Re-check PhonePe ID after truncating stop words
  const phonePeTruncated = clean.match(/^T\d{18,24}/i);
  if (phonePeTruncated) {
    return phonePeTruncated[0];
  }

  // 4. Standalone 12-digit UPI UTR number (e.g. 626462916810 / 828531141878 / 216192949106)
  const twelveDigitExact = clean.match(/^\d{12}$/);
  if (twelveDigitExact) {
    return twelveDigitExact[0];
  }

  const startTwelveMatch = clean.match(/^\d{12}(?!\d)/);
  if (startTwelveMatch) {
    return startTwelveMatch[0];
  }

  // 5. If remaining string contains a PhonePe ID anywhere
  const innerPhonePe = clean.match(/T\d{18,24}/i);
  if (innerPhonePe) {
    return innerPhonePe[0];
  }

  // 6. If remaining string contains 12 digits anywhere
  const innerTwelve = clean.match(/\d{12}/);
  if (innerTwelve) {
    return innerTwelve[0];
  }

  return clean;
}

/**
 * Extracts candidate transaction IDs from text using multi-pass rules.
 */
export function extractCandidateTxnIds(text: string): string[] {
  if (!text) return [];

  const candidates: string[] = [];

  // Pass 1: Multi-line & Multi-Space Explicit Label Matching for Super.Money, PhonePe, GPay, Paytm, Amazon Pay, BHIM, PayZapp & Bank Apps
  const labelRegex = /(?:UPI\s*reference\s*ID|UPI\s*reference\s*No|UPI\s*reference|UPI\s*Transaction\s*ID|Google\s*Pay\s*Txn\s*ID|PhonePe\s*Transaction\s*ID|Transaction\s*ID|Txn\s*ID|UPI\s*Ref(?:\s*No|\s*ID|\s*Num)?|Bank\s*Ref(?:\s*No|\s*Num)?|Reference\s*(?:ID|No|Num)?|Ref\s*No|Ref\s*ID|UTR(?:\s*No|\s*Num)?|Order\s*ID|RRN|Ref)\s*[\:\#\-\.\=]?\s*[\r\n]*\s*([A-Za-z0-9\s\-]{8,32})/gi;
  let match: RegExpExecArray | null;
  while ((match = labelRegex.exec(text)) !== null) {
    if (match[1]) {
      const sanitized = cleanExtractedTxnId(match[1]);
      if (sanitized.length >= 8 && !EXCLUDED_WORDS.has(sanitized.toUpperCase())) {
        if (!candidates.includes(sanitized)) {
          candidates.push(sanitized);
        }
      }
    }
  }

  // Pass 2: Standalone PhonePe Transaction IDs e.g. T2609211739314825672066
  const phonePeRegex = /\bT\d{18,24}\b/gi;
  let phonePeMatch: RegExpExecArray | null;
  while ((phonePeMatch = phonePeRegex.exec(text)) !== null) {
    const item = phonePeMatch[0].trim();
    if (!candidates.includes(item)) {
      candidates.push(item);
    }
  }

  // Pass 3: Spaced or Grouped 12-Digit Numbers e.g. "2161 9294 9106" or "8285 3114 1878"
  const spaced12Regex = /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/g;
  let spacedMatch: RegExpExecArray | null;
  while ((spacedMatch = spaced12Regex.exec(text)) !== null) {
    const cleaned = spacedMatch[0].replace(/[\s\-]/g, "");
    if (cleaned.length === 12 && !candidates.includes(cleaned)) {
      candidates.push(cleaned);
    }
  }

  // Pass 4: Standard 12-Digit Numeric UPI UTR / Ref IDs (e.g. 216192949106 / 828531141878)
  const twelveDigitMatches = text.match(/\b\d{12}\b/g);
  if (twelveDigitMatches) {
    for (const item of twelveDigitMatches) {
      if (!candidates.includes(item)) {
        candidates.push(item);
      }
    }
  }

  // Pass 5: Standalone 10 to 24 Character Alphanumeric IDs (e.g. PAYTM12345678, T240923143012345)
  const alphaNumMatches = text.match(/\b[A-Z0-9]{10,24}\b/gi);
  if (alphaNumMatches) {
    for (const item of alphaNumMatches) {
      const sanitized = cleanExtractedTxnId(item);
      const clean = sanitized.toUpperCase().trim();
      if (clean.length >= 8 && !EXCLUDED_WORDS.has(clean) && !candidates.includes(clean)) {
        if (/\d/.test(clean) && !/^(FILE|CACHE|URI|DATA|ANDROID|STORAGE)$/i.test(clean)) {
          candidates.push(clean);
        }
      }
    }
  }

  return candidates;
}

/**
 * Parses raw OCR text to extract the highest probability UPI Ref No, UTR, or Bank Txn ID.
 */
export function parseTransactionIdFromText(text: string): string | null {
  const candidates = extractCandidateTxnIds(text);
  return candidates.length > 0 ? candidates[0] : null;
}

/**
 * Parses raw OCR text to extract the payment amount (Rupees / INR).
 * Disambiguates Rupee glyph misreadings and parses word amounts (e.g. "Two Thousand Eight Hundred Rupees" -> 2800).
 */
export function parseAmountFromText(text: string): number | null {
  if (!text) return null;

  // Layer 1: Check English Words Amount (e.g. "Two Thousand Eight Hundred Rupees" -> 2800)
  const wordAmount = parseAmountFromWords(text);
  if (wordAmount && wordAmount >= 10 && wordAmount <= 500000) {
    return wordAmount;
  }

  const rawCandidates: number[] = [];

  // Layer 2: Standalone Number Line directly before "Rupees" or "Paid to" or "Paid Successfully"
  const preLabelRegex = /(?:^|[\r\n]+)\s*[\*\'\”\~\`\?]?\s*([\d\,]{3,7}(?:\.\d{1,2})?)\s*[\r\n]+(?:\s*Rupees|\s*Two|\s*One|\s*Three|\s*Four|\s*Five|\s*Six|\s*Seven|\s*Eight|\s*Nine|\s*Paid\s*to|\s*Paid\s*Successfully)/gi;
  let preMatch: RegExpExecArray | null;
  while ((preMatch = preLabelRegex.exec(text)) !== null) {
    if (preMatch[1]) {
      const cleanNum = parseFloat(preMatch[1].replace(/,/g, ""));
      if (!isNaN(cleanNum) && cleanNum > 0 && cleanNum < 500000) {
        if (!rawCandidates.includes(cleanNum)) {
          rawCandidates.push(cleanNum);
        }
      }
    }
  }

  // Layer 3: Explicit Rupee / Currency Symbols (handling superscript ₹, Rs, INR, ?, *)
  const currencyRegex = /(?:[₹\u20B9\*\~\’\`\?]|\bRs\.?|\bINR|\bAmt|\bAmount)\s*([\d\,]{3,7}(?:\.\d{1,2})?)/gi;
  let match: RegExpExecArray | null;
  while ((match = currencyRegex.exec(text)) !== null) {
    if (match[1]) {
      const cleanNum = parseFloat(match[1].replace(/,/g, ""));
      if (!isNaN(cleanNum) && cleanNum > 0 && cleanNum < 500000) {
        if (!rawCandidates.includes(cleanNum)) {
          rawCandidates.push(cleanNum);
        }
      }
    }
  }

  // Layer 4: "Paid", "Amount", "Total", "Debited" labels e.g. "Paid ₹2,800" or "Paid 2,800"
  const paidRegex = /(?:Paid|Amount|Received|Total|Debited|Paid\s*to)\s*[\:\#\-\.\=]?\s*(?:[₹\u20B9\*\~\’\`\?]|Rs\.?|INR)?\s*([\d\,]{3,7}(?:\.\d{1,2})?)/gi;
  let paidMatch: RegExpExecArray | null;
  while ((paidMatch = paidRegex.exec(text)) !== null) {
    if (paidMatch[1]) {
      const cleanNum = parseFloat(paidMatch[1].replace(/,/g, ""));
      if (!isNaN(cleanNum) && cleanNum > 0 && cleanNum < 500000) {
        if (!rawCandidates.includes(cleanNum)) {
          rawCandidates.push(cleanNum);
        }
      }
    }
  }

  // Layer 5: Comma-formatted numbers e.g. "2,800" or "2,800.00"
  const commaAmountRegex = /\b\d{1,3}(?:\,\d{3})+(?:\.\d{1,2})?\b/g;
  let commaMatch: RegExpExecArray | null;
  while ((commaMatch = commaAmountRegex.exec(text)) !== null) {
    const cleanNum = parseFloat(commaMatch[0].replace(/,/g, ""));
    if (!isNaN(cleanNum) && cleanNum > 0 && cleanNum < 500000) {
      if (!rawCandidates.includes(cleanNum)) {
        rawCandidates.push(cleanNum);
      }
    }
  }

  // Sanitize candidates: Disambiguate misread Rupee symbol (where '₹' was misread as leading '3' or '7' e.g. 32800 -> 2800)
  const sanitizedCandidates: number[] = [];
  for (const num of rawCandidates) {
    if (num >= 30000 && num <= 399999) {
      const strippedThree = parseFloat(String(num).slice(1));
      if (!isNaN(strippedThree) && strippedThree > 0) {
        sanitizedCandidates.push(strippedThree);
        continue;
      }
    }
    sanitizedCandidates.push(num);
  }

  // Filter out system years/dates/UTRs
  const filtered = sanitizedCandidates.filter(num => num >= 10 && num <= 200000 && num !== 2026 && num !== 2025 && num !== 2024);

  return filtered.length > 0 ? filtered[0] : null;
}

/**
 * Single-pass OCR recognition: extracts BOTH transaction ID and amount together from an image URI.
 */
export async function extractPaymentDetailsFromImage(imageUri: string): Promise<ExtractedPaymentDetails> {
  if (!imageUri) return { txnId: null, amount: null };

  let rawText = "";

  // 1. Native Mobile (Android / iOS): Use Google ML Kit Text Recognition (Single Pass)
  if (Platform.OS !== "web") {
    try {
      const TextRecognition = (await import("@react-native-ml-kit/text-recognition")).default;
      const result = await TextRecognition.recognize(imageUri);
      rawText = result?.text || "";
    } catch (err) {
      console.warn("Native ML Kit text recognition error:", err);
    }
  }

  // 2. Web Runtime: Use Tesseract.js (Single Pass)
  if (Platform.OS === "web" && typeof (globalThis as any).Worker !== "undefined") {
    try {
      const TesseractModule = await import("tesseract.js");
      const Tesseract = TesseractModule.default || TesseractModule;
      const res = await Tesseract.recognize(imageUri, "eng");
      rawText = res?.data?.text || "";
    } catch (err) {
      console.warn("Web Tesseract OCR notice:", err);
    }
  }

  // From the single OCR text block, parse BOTH Txn ID and Amount together!
  const txnId = parseTransactionIdFromText(rawText);
  const amount = parseAmountFromText(rawText);

  return { txnId, amount, rawText };
}

/**
 * Legacy wrapper for single-pass transaction ID extraction.
 */
export async function extractTransactionIdFromImage(imageUri: string): Promise<string | null> {
  const details = await extractPaymentDetailsFromImage(imageUri);
  return details.txnId;
}

/**
 * Launches camera to capture payment receipt photo and extracts BOTH transaction ID and amount together.
 */
export async function capturePhotoAndExtractDetails(): Promise<{ uri: string | null; txnId: string | null; amount: number | null }> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    return { uri: null, txnId: null, amount: null };
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 0.9,
    allowsEditing: true,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return { uri: null, txnId: null, amount: null };
  }

  const asset = result.assets[0];
  const uri = asset.uri;
  const { txnId, amount } = await extractPaymentDetailsFromImage(uri);

  return { uri, txnId, amount };
}

/**
 * Legacy wrapper for camera capture.
 */
export async function capturePhotoAndExtractTxnId(): Promise<{ uri: string | null; txnId: string | null }> {
  const details = await capturePhotoAndExtractDetails();
  return { uri: details.uri, txnId: details.txnId };
}

/**
 * Opens image gallery to pick an existing payment screenshot and extracts BOTH transaction ID and amount together.
 */
export async function pickScreenshotAndExtractDetails(): Promise<{ uri: string | null; txnId: string | null; amount: number | null }> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    return { uri: null, txnId: null, amount: null };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 1,
    allowsEditing: true,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return { uri: null, txnId: null, amount: null };
  }

  const asset = result.assets[0];
  const uri = asset.uri;
  const { txnId, amount } = await extractPaymentDetailsFromImage(uri);

  return { uri, txnId, amount };
}

/**
 * Legacy wrapper for gallery screenshot picker.
 */
export async function pickScreenshotAndExtractTxnId(): Promise<{ uri: string | null; txnId: string | null }> {
  const details = await pickScreenshotAndExtractDetails();
  return { uri: details.uri, txnId: details.txnId };
}
