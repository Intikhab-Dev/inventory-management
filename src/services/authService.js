// Service to mock Authentication APIs (Signup, Login, Logout) and session management with end-of-day expiration.

const USERS_KEY = "ims_users";
const SESSION_KEY = "ims_session";

// Helper to get registered users from localStorage
const getUsers = () => {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch (e) {
    return [];
  }
};

// Helper to save registered users
const saveUsers = (users) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

// Calculate end of the current day (11:59:59.999 PM)
const getEndOfDayTimestamp = () => {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date.getTime();
};

// Helper to hash password using SHA-256 (Web Crypto API)
const hashPassword = async (password) => {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
};

export const authService = {
  /**
   * Registers a new user.
   * @param {string} name 
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<{success: boolean, message: string, user?: object}>}
   */
  signup: async (name, email, password) => {
    // Simulate API network latency
    await new Promise((resolve) => setTimeout(resolve, 600));

    const users = getUsers();
    const emailLower = email.toLowerCase().trim();

    // Check if email already registered
    const userExists = users.some((u) => u.email.toLowerCase() === emailLower);
    if (userExists) {
      return { success: false, message: "Email is already registered!" };
    }

    const hashedPassword = await hashPassword(password);

    const newUser = {
      id: Date.now().toString(),
      name: name.trim(),
      email: emailLower,
      password: hashedPassword,
    };

    users.push(newUser);
    saveUsers(users);

    return {
      success: true,
      message: "Registration successful! You can now login.",
      user: { name: newUser.name, email: newUser.email },
    };
  },

  /**
   * Logins a user and creates an end-of-day session.
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<{success: boolean, message: string, user?: object, token?: string}>}
   */
  login: async (email, password) => {
    // Simulate API network latency
    await new Promise((resolve) => setTimeout(resolve, 600));

    const users = getUsers();
    const emailLower = email.toLowerCase().trim();

    const user = users.find((u) => u.email.toLowerCase() === emailLower);

    if (!user) {
      return { success: false, message: "Invalid email or password!" };
    }

    const hashedPassword = await hashPassword(password);
    let passwordMatches = user.password === hashedPassword;

    // Fallback for upgrading older unhashed local accounts
    if (!passwordMatches && user.password === password) {
      passwordMatches = true;
      user.password = hashedPassword;
      saveUsers(users);
    }

    if (!passwordMatches) {
      return { success: false, message: "Invalid email or password!" };
    }

    // Generate simulated token
    const token = "token_" + Math.random().toString(36).substr(2) + "_" + Date.now();
    const expiresAt = getEndOfDayTimestamp();

    const session = {
      token,
      expiresAt,
      user: {
        name: user.name,
        email: user.email,
      },
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    return {
      success: true,
      message: "Login successful!",
      user: session.user,
      token,
    };
  },

  /**
   * Logs out the current user and clears session storage.
   * @returns {Promise<{success: boolean, message: string}>}
   */
  logout: async () => {
    // Simulate API network latency
    await new Promise((resolve) => setTimeout(resolve, 300));
    localStorage.removeItem(SESSION_KEY);
    return { success: true, message: "Logged out successfully!" };
  },

  /**
   * Gets the current session if it is valid and has not expired.
   * If expired, removes the session and returns null.
   * @returns {object|null} The session user or null
   */
  getCurrentSession: () => {
    try {
      const sessionStr = localStorage.getItem(SESSION_KEY);
      if (!sessionStr) return null;

      const session = JSON.parse(sessionStr);
      const now = Date.now();

      // Check if session has expired
      if (now > session.expiresAt) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }

      return session;
    } catch (e) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  },
};
