import { cloneElement, isValidElement, useEffect, useId, useRef } from "react";
import { t } from "./i18n.js";
import { X, LoaderCircle } from "lucide-react";
export function Button({
  children,
  busy,
  disabled,
  variant = "",
  className = "",
  ...props
}) {
  return (
    <button
      className={`button ${variant} ${className}`}
      disabled={busy || disabled}
      aria-busy={busy || undefined}
      {...props}
    >
      {busy ? <LoaderCircle size={18} className="spin" /> : null}
      {children}
    </button>
  );
}
export function Field({ label, hint, children, ...props }) {
  const hintId = useId();
  const labelId = useId();
  const describedBy = hint
    ? {
        "aria-describedby": [
          children?.props?.["aria-describedby"] || props["aria-describedby"],
          hintId,
        ]
          .filter(Boolean)
          .join(" "),
      }
    : {};
  return (
    <label className="field">
      <span id={labelId}>{label}</span>
      {isValidElement(children)
        ? cloneElement(children, { "aria-labelledby": labelId, ...describedBy })
        : children || (
            <input aria-labelledby={labelId} {...props} {...describedBy} />
          )}
      {hint ? <small id={hintId}>{hint}</small> : null}
    </label>
  );
}
export function Notice({ children, error }) {
  return children ? (
    <p
      className={`notice ${error ? "error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {typeof children === "string" ? t(children) : children}
    </p>
  ) : null;
}
export function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef(null);
  const titleId = useId();
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
      aria-labelledby={titleId}
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
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label={t("Chiudi")}
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
