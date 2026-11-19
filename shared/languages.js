export const languages = Object.freeze({
  it: "Italiano",
  en: "English",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  pt: "Português",
});
export const localeCodes = Object.keys(languages);
export const supportsLocale = (code) =>
  typeof code === "string" && Object.hasOwn(languages, code);

export function interpolate(message, values) {
  if (!values) return message;
  return message.replace(/\{(\w+)\}/g, (token, name) =>
    Object.hasOwn(values, name) ? String(values[name]) : token,
  );
}
