const STOCK_LOG_KEY = "stockLogs";

const getAll = () => {
    try {
        return JSON.parse(localStorage.getItem(STOCK_LOG_KEY)) || [];
    } catch {
        return [];
    }
};

const save = (logs) => {
    localStorage.setItem(STOCK_LOG_KEY, JSON.stringify(logs));
};

/**
 * Add a stock movement log entry.
 * @param {string|number} itemId
 * @param {string} itemName
 * @param {"in"|"out"} type
 * @param {number} qty
 * @param {string} [note]
 * @param {string} [userName]
 */
const addLog = (itemId, itemName, type, qty, note = "", userName = "System") => {
    const logs = getAll();
    const entry = {
        id: Date.now(),
        itemId: String(itemId),
        itemName,
        type,           // "in" or "out"
        qty: Number(qty),
        note,
        userName,
        timestamp: Date.now(),
    };
    logs.unshift(entry);  // newest first
    save(logs);
    return entry;
};

/** Get logs for a specific item */
const getLogsForItem = (itemId) => {
    return getAll().filter(l => String(l.itemId) === String(itemId));
};

/** Clear all logs for a specific item */
const clearLogsForItem = (itemId) => {
    const remaining = getAll().filter(l => String(l.itemId) !== String(itemId));
    save(remaining);
};

export const stockLogService = { getAll, addLog, getLogsForItem, clearLogsForItem };
