// Service to handle Activity Logging and Audit Trails in localStorage

const LOGS_KEY = "ims_activity_logs";

export const activityService = {
  /**
   * Adds a new activity log entry.
   * @param {string} actionType - 'login' | 'logout' | 'signup' | 'add_item' | 'update_item' | 'delete_item'
   * @param {string} details - Detailed text of the action
   * @param {string} userName - Name of the user who performed the action
   */
  addLog: (actionType, details, userName) => {
    try {
      const logs = activityService.getLogs();
      
      const newLog = {
        id: Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        timestamp: Date.now(),
        actionType,
        details,
        userName: userName || "System",
      };

      logs.unshift(newLog); // Add to the beginning (newest first)

      // Cap logs at 100 to prevent localStorage bloat
      const cappedLogs = logs.slice(0, 100);
      localStorage.setItem(LOGS_KEY, JSON.stringify(cappedLogs));
      
      return newLog;
    } catch (error) {
      console.error("Failed to save activity log:", error);
      return null;
    }
  },

  /**
   * Retrieves all activity logs.
   * @returns {Array} List of log objects
   */
  getLogs: () => {
    try {
      return JSON.parse(localStorage.getItem(LOGS_KEY)) || [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Clears all activity logs.
   * @returns {boolean} Success status
   */
  clearLogs: () => {
    try {
      localStorage.removeItem(LOGS_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }
};
