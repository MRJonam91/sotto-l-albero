import { useEffect, useRef } from "react";
import { X, LoaderCircle } from "lucide-react";
export function Button({
  children,
  busy,
  variant = "",
  className = "",
  ...props
}) {
  return (
    <button
      className={`button ${variant} ${className}`}
      disabled={busy || props.disabled}
      {...props}
    >
      {busy ? <LoaderCircle size={18} className="spin" /> : null}
      {children}
    </button>
  );
}
export function Field({ label, hint, children, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children || <input {...props} />} {hint ? <small>{hint}</small> : null}
    </label>
  );
}
export function Notice({ children, error }) {
  return children ? (
    <p
      className={`notice ${error ? "error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </p>
  ) : null;
}
export function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const before = document.activeElement;
    ref.current.showModal();
    return () => {
      ref.current?.close();
      before?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Chiudi" onClick={onClose}>
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
