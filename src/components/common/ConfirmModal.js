import React from "react";
import "./ConfirmModal.css";

const ConfirmModal = ({ show, onClose, onConfirm, itemName }) => {
  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3>Confirm Delete</h3>

        <p>
          Are you sure you want to delete <b>{itemName}</b>?
          <br />
          This action cannot be undone.
        </p>

        <div className="modal-actions">
          <button className="btn cancel" onClick={onClose}>
            Cancel
          </button>

          <button className="btn delete" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;