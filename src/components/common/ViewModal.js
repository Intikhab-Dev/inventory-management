import React from "react";
import "./ViewModal.css";

const ViewModal = ({ show, onClose, item }) => {
  if (!show || !item) return null;

  return (
    <div className="modal-overlay">
      <div className="view-modal">

        {/* Close icon */}
        <span className="close-icon" onClick={onClose}>
          ✕
        </span>

        <h4 className="modal-title text-center text-primary">Item Details</h4>
        <hr className="separator opacity-25" />

        <div className="view-grid">
          <div>
            <label>Name</label>
            <p>{item.name}</p>
          </div>

          <div>
            <label>Warehouse</label>
            <p>{item.warehouse}</p>
          </div>

          <div>
            <label>Type</label>
            <p>{item.category_type}</p>
          </div>

          <div>
            <label>Category</label>
            <p>{item.category}</p>
          </div>

          {/* <div>
            <label>Purchase Date</label>
            <p>
              {item.purchaseDate
                ? new Date(item.purchaseDate).toLocaleDateString('en-GB')
                : "N/A"
              }
            </p>
          </div> */}

          <div>
            <label>Quantity</label>
            <p>{item.quantity}</p>
          </div>

          <div>
            <label>Price</label>
            <p>₹ {item.price}</p>
          </div>

          <div>
            <label>Tax</label>
            <p>₹ {item.tax}</p>
          </div>

          <div>
            <label>Total Amount</label>
            <p className="highlight">₹ {item.total}</p>
          </div>

          <div>
            <label>Supplier</label>
            <p>{item.supplier}</p>
          </div>

          <div>
            <label>Code</label>
            <p>{item.code}</p>
          </div>

          <div>
            <label>Status</label>
            <p className={item.status === "1" ? "active" : "inactive"}>
              {item.status === "1" ? "Active" : "Inactive"}
            </p>
          </div>

          <div>
            <label>Created Date</label>
            <p>
              {item.createdDate
                ? new Date(Number(item.createdDate)).toLocaleDateString("en-GB")
                : "N/A"}
            </p>
          </div>

          <div className="full">
            <label>Description</label>
            <p>{item.description || "N/A"}</p>
          </div>

        </div>

        <button className="close-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default ViewModal;