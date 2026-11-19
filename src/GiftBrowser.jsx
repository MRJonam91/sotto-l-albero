import { getLocale, t } from "./i18n.js";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  ExternalLink,
  MapPin,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { api } from "./api.js";
import { Button, Field, Notice } from "./ui.jsx";
import { productSearchLinks } from "../shared/amazonLinks.js";
import "./gift-browser.css";

const euro = (value) =>
  new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
const categories = [
  ["all", "Tutte le idee"],
  ["home", "Casa e cucina"],
  ["games", "Giochi"],
  ["creative", "Creatività"],
  ["stationery", "Libri e cancelleria"],
  ["care", "Benessere"],
];

export function GiftProductCard({ product, selected, disabled, onAdd }) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <article className="gift-product">
      <a
        href={product.url}
        target="_blank"
        rel="noopener noreferrer"
        className="gift-product-image"
        aria-label={t("Vedi {title} su {merchant}", {
          title: product.title,
          merchant: product.merchant,
        })}
      >
        {imageFailed ? (
          <span>{t("Foto non disponibile")}</span>
        ) : (
          <img
            src={product.image}
            alt={product.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
          />
        )}
      </a>
      <div className="gift-product-copy">
        <small className="gift-product-merchant">{product.merchant}</small>
        <h4>{product.title}</h4>
        <strong className="gift-product-price">{euro(product.price)}</strong>
        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          className="gift-product-shop"
        >
          {t("Vedi nel negozio")} <ExternalLink size={13} aria-hidden="true" />
        </a>
        <Button
          type="button"
          variant={selected ? "outline" : ""}
          disabled={disabled || selected}
          onClick={() => onAdd({ title: product.title, url: product.url })}
          aria-label={
            selected
              ? t("{title} già nella lettera", { title: product.title })
              : t("Aggiungi {title} alla lettera", { title: product.title })
          }
        >
          {selected ? (
            <Check size={16} aria-hidden="true" />
          ) : (
            <Plus size={16} aria-hidden="true" />
          )}
          {selected ? t("Nella tua lettera") : t("Lo vorrei")}
        </Button>
      </div>
    </article>
  );
}

export default function GiftBrowser({
  eventId,
  budget,
  selectedUrls = [],
  disabled,
  onAdd,
  onBrowseLocal,
}) {
  const [category, setCategory] = useState("all");
  const [band, setBand] = useState("all");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addedTitle, setAddedTitle] = useState("");
  const [cursor, setCursor] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [checkedAt, setCheckedAt] = useState("");
  const [expired, setExpired] = useState(false);
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const maxBudget = Math.max(0, Number(budget) || 0);
  const min = band === "upper" ? Math.round(maxBudget * 50) / 100 : 0;
  const max = band === "small" ? Math.min(10, maxBudget) : maxBudget;
  const shoppingQuery =
    search.trim() ||
    (category === "all"
      ? "idee regalo"
      : categories.find(([id]) => id === category)[1]);
  const amazonUrl = productSearchLinks(shoppingQuery).amazon;
  async function load(append, currentGeneration) {
    setLoading(true);
    setError("");
    if (!append) {
      setProducts([]);
      setCursor("");
      setHasMore(false);
      setCheckedAt("");
      setExpired(false);
    }
    const params = new URLSearchParams({
      eventId,
      category,
      min: String(min),
      max: String(max),
    });
    if (query) params.set("q", query);
    if (append && cursor) params.set("cursor", cursor);
    try {
      const result = await api(`/gifts?${params}`);
      if (generation.current !== currentGeneration) return;
      setProducts((previous) =>
        append
          ? [
              ...previous,
              ...result.products.filter(
                (product) => !previous.some((old) => old.id === product.id),
              ),
            ]
          : result.products,
      );
      setCursor(result.cursor || "");
      setHasMore(result.hasMore === true);
      if (!append) setCheckedAt(result.checkedAt);
    } catch (failure) {
      if (generation.current === currentGeneration) setError(failure.message);
    } finally {
      if (generation.current === currentGeneration) setLoading(false);
    }
  }
  useEffect(() => {
    const current = ++generation.current;
    load(false, current);
    return () => {
      ++generation.current;
    };
  }, [eventId, category, min, max, query, revision]);
  useEffect(() => {
    if (!checkedAt) return;
    const remaining = new Date(checkedAt).valueOf() + 10 * 60_000 - Date.now();
    const timeout = setTimeout(() => setExpired(true), Math.max(0, remaining));
    return () => clearTimeout(timeout);
  }, [checkedAt]);
  return (
    <section className="gift-browser" aria-labelledby="gift-browser-title">
      <div className="gift-browser-heading">
        <div>
          <p className="eyebrow">{t("Idee per la tua lettera")}</p>
          <h3 id="gift-browser-title">{t("Quale regalo ti piacerebbe?")}</h3>
          <p>{t("Sfoglia i prodotti e aggiungi quelli che ti piacciono.")}</p>
        </div>
        <span className="gift-budget">
          {t("Budget dello scambio")} <strong>{euro(maxBudget)}</strong>
        </span>
      </div>
      <div
        className="gift-filter-row"
        role="group"
        aria-label={t("Categorie di idee regalo")}
      >
        {categories.map(([id, label]) => (
          <button
            type="button"
            key={id}
            className="gift-filter"
            aria-pressed={category === id}
            onClick={() => {
              setCategory(id);
              setQuery("");
              setSearch("");
            }}
          >
            {t(label)}
          </button>
        ))}
      </div>
      <div
        className="gift-filter-row gift-price-filters"
        role="group"
        aria-label={t("Fascia di prezzo entro il budget")}
      >
        <button
          type="button"
          className="gift-filter"
          aria-pressed={band === "all"}
          onClick={() => setBand("all")}
        >
          {t("Fino a {price}", { price: euro(maxBudget) })}
        </button>
        {maxBudget > 10 ? (
          <button
            type="button"
            className="gift-filter"
            aria-pressed={band === "small"}
            onClick={() => setBand("small")}
          >
            {t("Sotto i 10 €")}
          </button>
        ) : null}
        {maxBudget > 0 ? (
          <button
            type="button"
            className="gift-filter"
            aria-pressed={band === "upper"}
            onClick={() => setBand("upper")}
          >
            {euro(Math.round(maxBudget * 50) / 100)} – {euro(maxBudget)}
          </button>
        ) : null}
      </div>
      <details className="gift-specific-search">
        <summary>
          <Search size={16} aria-hidden="true" />{" "}
          {t("Cerchi qualcosa di preciso?")}
        </summary>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(search.trim());
            setRevision((value) => value + 1);
          }}
        >
          <Field
            label={t("Cerca nel catalogo")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            maxLength={100}
            placeholder={t("Per esempio, un puzzle o una tazza")}
          />
          <Button type="submit" variant="outline" disabled={loading}>
            {t("Cerca")}
          </Button>
        </form>
      </details>
      <div className="gift-shopping-links">
        <a
          className="button outline"
          href={amazonUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("Cerca su Amazon.it")}{" "}
          <ExternalLink size={15} aria-hidden="true" />
        </a>
        <Button
          type="button"
          variant="outline"
          onClick={() => onBrowseLocal(shoppingQuery)}
        >
          <MapPin size={17} aria-hidden="true" />
          {t("Cerca negozi in città")}
        </Button>
        <p>{t("I filtri di prezzo si applicano al catalogo qui sotto.")}</p>
      </div>
      <Notice error>{error}</Notice>
      <Notice>
        {addedTitle &&
          t("Hai aggiunto “{title}”. Salva la lettera per conservarlo.", {
            title: addedTitle,
          })}
      </Notice>
      {expired ? (
        <div className="gift-catalog-message">
          <p>{t("Aggiorna i prodotti per rivedere i prezzi recenti.")}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setRevision((value) => value + 1)}
          >
            <RefreshCw size={15} aria-hidden="true" />
            {t("Aggiorna prodotti")}
          </Button>
        </div>
      ) : (
        <>
          {!!products.length && (
            <div
              className="gift-product-grid"
              role="region"
              aria-label={t("Prodotti entro il budget dello scambio")}
              tabIndex={0}
            >
              {products.map((product) => (
                <GiftProductCard
                  key={product.id}
                  product={product}
                  selected={selectedUrls.includes(product.url)}
                  disabled={disabled}
                  onAdd={(item) => {
                    if (onAdd(item) !== false) setAddedTitle(item.title);
                  }}
                />
              ))}
            </div>
          )}
          {loading ? (
            <p className="gift-catalog-message" role="status">
              {t("Cerchiamo prodotti entro {price}…", { price: euro(max) })}
            </p>
          ) : !products.length && !error ? (
            <p className="gift-catalog-message">
              {t(
                "Nessun prodotto in questa fascia. Prova un’altra categoria o aggiungi un link tuo.",
              )}
            </p>
          ) : null}
          {hasMore ? (
            <div className="gift-load-more">
              <Button
                type="button"
                variant="outline"
                busy={loading}
                onClick={() => load(true, generation.current)}
              >
                {t("Mostra altri prodotti")}
              </Button>
            </div>
          ) : null}
        </>
      )}
      {error ? (
        <div className="gift-load-more">
          <Button
            type="button"
            variant="outline"
            onClick={() => setRevision((value) => value + 1)}
          >
            {t("Riprova il catalogo")}
          </Button>
        </div>
      ) : null}
      <p className="gift-catalog-source">
        {t("Prodotti da Shopify Catalog · prezzi in euro, spedizione esclusa.")}
        {checkedAt
          ? " " +
            t("Verificati alle {time}.", {
              time: new Date(checkedAt).toLocaleTimeString(getLocale(), {
                hour: "2-digit",
                minute: "2-digit",
              }),
            })
          : ""}{" "}
        {t("Prezzo, disponibilità e consegna vanno confermati nel negozio.")}
      </p>
    </section>
  );
}
