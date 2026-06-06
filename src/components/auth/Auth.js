import React, { useState } from "react";
import { authService } from "../../services/authService";
import { activityService } from "../../services/activityService";
import "./Auth.css";

const Auth = ({ onAuthSuccess, showToast }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prevErrors) => {
        const updated = { ...prevErrors };
        delete updated[name];
        return updated;
      });
    }
    if (error) setError("");
  };

  const validateForm = () => {
    const { name, email, password, confirmPassword } = formData;
    const tempErrors = {};

    if (isLogin) {
      if (!email) {
        tempErrors.email = "Email is required.";
      } else if (!/\S+@\S+\.\S+/.test(email)) {
        tempErrors.email = "Please enter a valid email address.";
      }
      if (!password) {
        tempErrors.password = "Password is required.";
      }
    } else {
      if (!name || !name.trim()) {
        tempErrors.name = "Full Name is required.";
      }
      if (!email) {
        tempErrors.email = "Email is required.";
      } else if (!/\S+@\S+\.\S+/.test(email)) {
        tempErrors.email = "Please enter a valid email address.";
      }
      if (!password) {
        tempErrors.password = "Password is required.";
      } else if (password.length < 6) {
        tempErrors.password = "Password must be at least 6 characters.";
      }
      if (!confirmPassword) {
        tempErrors.confirmPassword = "Confirm password is required.";
      } else if (password !== confirmPassword) {
        tempErrors.confirmPassword = "Passwords do not match.";
      }
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        const res = await authService.login(formData.email, formData.password);
        if (res.success) {
          activityService.addLog("login", "Logged in to session", res.user.name);
          showToast(res.message);
          onAuthSuccess(res.user);
        } else {
          setError(res.message);
        }
      } else {
        const res = await authService.signup(formData.name, formData.email, formData.password);
        if (res.success) {
          activityService.addLog("signup", `Registered new account: ${formData.email.toLowerCase().trim()}`, formData.name.trim());
          showToast(res.message);
          setIsLogin(true);
          setFormData((prev) => ({
            ...prev,
            password: "",
            confirmPassword: "",
            name: "",
          }));
        } else {
          setError(res.message);
        }
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleTab = (tab) => {
    setIsLogin(tab);
    setError("");
    setErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
    setFormData({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
  };

  return (
    <div className="auth-wrapper">
      <div className="bg-circle bg-circle-1"></div>
      <div className="bg-circle bg-circle-2"></div>

      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">IMS</div>
          <h2>Inventory Management System</h2>
          <p>{isLogin ? "Welcome back! Please login to your account." : "Create an account to get started."}</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab-btn ${isLogin ? "active" : ""}`}
            onClick={() => toggleTab(true)}
            type="button"
          >
            Login
          </button>
          <button
            className={`auth-tab-btn ${!isLogin ? "active" : ""}`}
            onClick={() => toggleTab(false)}
            type="button"
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="auth-error-alert animate-fade-in">
            <i className="bi bi-exclamation-triangle-fill"></i>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {!isLogin && (
            <div className="auth-field-group">
              <label htmlFor="name">Full Name</label>
              <div className="auth-input-wrapper">
                <i className="bi bi-person"></i>
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={errors.name ? "is-invalid" : ""}
                />
              </div>
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>
          )}

          <div className="auth-field-group">
            <label htmlFor="email">Email Address</label>
            <div className="auth-input-wrapper">
              <i className="bi bi-envelope"></i>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={handleInputChange}
                className={errors.email ? "is-invalid" : ""}
              />
            </div>
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          <div className="auth-field-group">
            <label htmlFor="password">Password</label>
            <div className="auth-input-wrapper">
              <i className="bi bi-lock"></i>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                placeholder="Enter password"
                value={formData.password}
                onChange={handleInputChange}
                className={errors.password ? "is-invalid" : ""}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <i className={`bi bi-eye${showPassword ? "-slash" : ""}`}></i>
              </button>
            </div>
            {errors.password && <span className="error-text">{errors.password}</span>}
          </div>

          {!isLogin && (
            <div className="auth-field-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="auth-input-wrapper">
                <i className="bi bi-shield-check"></i>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={errors.confirmPassword ? "is-invalid" : ""}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  <i className={`bi bi-eye${showConfirmPassword ? "-slash" : ""}`}></i>
                </button>
              </div>
              {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
            </div>
          )}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? (
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            ) : isLogin ? (
              "Login"
            ) : (
              "Sign Up"
            )}
          </button>
        </form>

        <div className="auth-footer mt-4 text-center">
          <p>
            {isLogin ? (
              <>
                Don't have an account?{" "}
                <span className="auth-link" onClick={() => toggleTab(false)}>
                  Create one now
                </span>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <span className="auth-link" onClick={() => toggleTab(true)}>
                  Login instead
                </span>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
