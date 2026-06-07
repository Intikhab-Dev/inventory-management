// Service to handle Stock Transactions Ledger (IN / OUT movements) in localStorage

const TRANSACTIONS_KEY = "stock_transactions";

export const transactionService = {
  /**
   * Adds a new stock transaction.
   * @param {object} data - { itemId, itemName, type: 'IN'|'OUT', qty, reason, notes, user }
   */
  addTransaction: (data) => {
    try {
      const transactions = transactionService.getTransactions();

      const newTx = {
        id: Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        timestamp: Date.now(),
        itemId: data.itemId || "",
        itemName: data.itemName || "",
        type: data.type || "IN", // 'IN' | 'OUT'
        qty: Math.max(0, Number(data.qty) || 0),
        reason: data.reason || "Manual Adjustment",
        notes: data.notes || "",
        user: data.user || "System",
      };

      transactions.unshift(newTx); // Newest first

      // Cap transactions at 500 to keep localStorage healthy
      const capped = transactions.slice(0, 500);
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(capped));

      return newTx;
    } catch (error) {
      console.error("Failed to add transaction:", error);
      return null;
    }
  },

  getTransactions: () => {
    try {
      const saved = localStorage.getItem(TRANSACTIONS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  },

  clearTransactions: () => {
    try {
      localStorage.removeItem(TRANSACTIONS_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }
};
