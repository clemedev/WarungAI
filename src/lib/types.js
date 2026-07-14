// Shared data shapes for WarungAI — see BACKEND.md §1.
// Do NOT change a field without telling the other engineer: the parser,
// storage, and dashboard all depend on these matching exactly.

/**
 * @typedef {Object} Product
 * @property {string} id
 * @property {string} name
 * @property {number} sellPrice  selling price in RM
 * @property {number} costPrice  cost price in RM
 */

/**
 * @typedef {Object} Sale
 * @property {string} id
 * @property {string} date        ISO date string, e.g. "2026-07-14"
 * @property {string} productId
 * @property {number} quantity
 * @property {number} total       total RM for this line (quantity included)
 * @property {'ocr'|'chat'|'voice'} source
 * @property {'cash'|'qr'} [paymentMethod]
 */

/**
 * @typedef {Object} Expense
 * @property {string} id
 * @property {string} date      ISO date string
 * @property {string} category  e.g. "ingredients", "gas", "packaging"
 * @property {number} amount    RM
 * @property {string} [note]
 */

/**
 * @typedef {Object} DashboardStats
 * @property {number} todayTotal
 * @property {number} todayProfit
 * @property {Array<{date: string, total: number}>} sevenDayTrend
 * @property {Array<{productId: string, name: string, quantity: number}>} topItems
 * @property {number} targetProgress  0..1 progress toward daily target
 */

/**
 * @typedef {Object} ReceiptItem  (output of parseReceiptText, pre-confirmation)
 * @property {string} name      raw item name as read from the receipt
 * @property {number} quantity
 * @property {number} price     total RM for the line
 */

/**
 * @typedef {Object} ParsedEntry  (output of parseNaturalLanguageEntry, pre-confirmation)
 * @property {string|null} productId    matched product, or null if no match
 * @property {string|null} productName
 * @property {number} quantity
 * @property {number|null} total        RM stated in the text, or derived from sellPrice
 * @property {number} confidence        0..1 match confidence
 * @property {boolean} needsReview      true when the user must fix something
 * @property {string} raw               the original input text
 */

export {};
