import { t } from "./i18n.js";
import { ArrowLeft, Stamp } from "lucide-react";
import "./secret-santa-rules.css";

const steps = [
  {
    id: "draw",
    title: "Scopri per chi prepari il regalo",
    text: "Apri la lettera e scopri per chi preparare il regalo. Anche qualcuno del gruppo sta pensando a una sorpresa per te.",
  },
  {
    id: "budget",
    title: "Scegli il regalo",
    text: "Dai un’occhiata alla lista dei desideri e tieni a mente il budget. Se avete scelto 20 euro con 5 euro di margine in più o in meno, puoi spendere tra 15 e 25 euro. Se avete fissato un massimo, resta entro quella cifra.",
  },
  {
    id: "wrap",
    title: "Impacchettalo",
    text: "Usa carta, una busta o una scatola. Se ti servono le forbici, chiedi aiuto a un adulto. Chiudi bene il pacco per lasciare la sorpresa a chi lo aprirà.",
  },
  {
    id: "tag",
    title: "Scrivi il nome di chi lo riceve",
    text: "Scrivi sull’etichetta il nome di chi riceverà il regalo, per esempio «Per Marco». Se ti va, aggiungi un biglietto di auguri. Per ora lascialo senza firma.",
  },
  {
    id: "hide",
    title: "Nascondilo e custodisci il segreto",
    text: "Metti il pacco al riparo dagli sguardi. Tieni per te il nome e il regalo che hai scelto. Se ti serve una mano, chiedila a un adulto di fiducia.",
  },
  {
    id: "exchange",
    title: "Portalo il giorno dello scambio",
    text: "Controlla dove e quando vi incontrate. Lascia il pacco nel posto che avete scelto, magari sotto l’albero. Al momento dello scambio, leggete i nomi sulle etichette e aprite i regali. Alla fine potete svelare chi ha regalato cosa, se siete tutti d’accordo.",
  },
];

const scenes = {
  draw: (
    <>
      <path d="M36 44 79 19l45 25v32H36Z" fill="#c67b60" />
      <path d="m43 54 9-34 43 10-9 34Z" fill="#ffe7ad" />
      <path d="m57 31 19 4m-22 4 12 3" stroke="#8b5a39" />
      <path d="m90 23 13 4-7 26-13-4Z" fill="#82aa93" />
      <path d="M36 44 80 66l44-22v32H36Z" fill="#eed196" />
      <path d="m36 76 33-22m55 22L91 54" />
      <circle cx="80" cy="63" r="7" fill="#ad404b" />
      <path d="M80 59v7m-3-3h6" stroke="#ffe2a0" strokeWidth="1.4" />
    </>
  ),
  budget: (
    <>
      <path d="M49 55h60v19H49a10 10 0 0 1 0-19Z" fill="#d9a763" />
      <ellipse cx="54" cy="62" rx="16" ry="10" fill="#f4d185" />
      <path d="M45 64h18m-14-5h9" stroke="#9a6638" />
      <path
        d="M85 29h32l11 9v27H85L74 54V40Z"
        fill="#e6ae7e"
        transform="rotate(-10 98 44)"
      />
      <circle cx="86" cy="38" r="3" fill="#fff1c8" />
      <path d="M112 38c-12-7-19 12-7 13m-10-9 11 2m-12 2 10 2" />
      <path d="M51 45c-3-9 1-15 8-15 6 0 10 6 9 12" stroke="#8b5a39" />
    </>
  ),
  wrap: (
    <>
      <path d="M46 45h67v29H46Z" fill="#a33a48" />
      <path d="M41 36h77v13H41Z" fill="#ca6570" />
      <path d="M73 36h13v38H73Z" fill="#f3d49b" />
      <path
        d="M80 36C64 37 56 30 60 24c5-7 15 3 20 12Zm0 0c16 1 24-6 20-12-5-7-15 3-20 12Z"
        fill="#edbc73"
      />
      <path d="M49 61h14m31 2h13" stroke="#f5b9a3" strokeWidth="1.8" />
    </>
  ),
  tag: (
    <>
      <path
        d="M41 30h43l14 12v31H41Z"
        fill="#ffe7ac"
        transform="rotate(8 67 51)"
      />
      <circle cx="48" cy="38" r="3" fill="#ca8e5a" />
      <path d="m56 45 22 3m-23 3 17 3m-18 3 19 3" stroke="#a9734e" />
      <path d="m98 65 24-35 8 6-24 35-10 4Z" fill="#91b19b" />
      <path d="m116 39 8 6m-26 20 8 6m-10 4 2-10" />
      <path d="M47 35c-13-16-22-7-14-1 4 3 11 4 14 1Z" stroke="#ab4654" />
    </>
  ),
  hide: (
    <>
      <path d="M43 23h74v51H43Z" fill="#6c907c" />
      <path d="M48 28h30v41H48Zm35 0h29v41H83Z" fill="#9cb69c" />
      <path d="M51 35h23m14 0h20M54 64h17m19 0h16" stroke="#547761" />
      <circle cx="73" cy="51" r="2" fill="#ffdc88" />
      <path d="M92 53h29v21H92Z" fill="#ba5360" />
      <path d="M89 51h35v6H89Z" fill="#d77b79" />
      <path d="M104 51h6v23h-6Z" fill="#f3d49b" />
      <path d="m107 51-7-7m7 7 7-7" stroke="#f3d49b" />
    </>
  ),
  exchange: (
    <>
      <path d="M76 56h11v18H76Z" fill="#9b603e" />
      <path d="m81 21 19 23H92l15 19H55l15-19h-8Z" fill="#6c9e83" />
      <path d="m81 12 2 4 5 1-4 3 1 5-4-2-4 2 1-5-4-3 5-1Z" fill="#f6ca71" />
      <circle cx="74" cy="48" r="2.4" fill="#f4cd83" />
      <circle cx="90" cy="53" r="2.4" fill="#bc5462" />
      <path d="M44 62h26v13H44Zm56-1h22v14h-22Z" fill="#c26164" />
      <path d="M54 62h6v13h-6Zm54-1h5v14h-5Z" fill="#f1d48e" />
      <path d="m57 62-6-5m6 5 5-5m48 4-5-5m5 5 5-5" stroke="#ba744a" />
    </>
  ),
};

function StepIllustration({ step }) {
  return (
    <svg viewBox="0 0 160 96" aria-hidden="true" focusable="false">
      <path
        d="M18 19h124v58H18Z"
        fill="none"
        stroke="#c49859"
        strokeWidth="1"
        strokeDasharray="2 4"
        opacity=".48"
      />
      <ellipse cx="80" cy="76" rx="51" ry="6" fill="#986b3c" opacity=".16" />
      <path
        d="M23 37v8m-4-4h8m108 12v8m-4-4h8M128 23v5m-2.5-2.5h5"
        stroke="#99602c"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <g
        fill="none"
        stroke="#523627"
        strokeWidth="1.85"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {scenes[step]}
      </g>
    </svg>
  );
}

export default function SecretSantaRules() {
  return (
    <section className="santa-rules" aria-labelledby="santa-rules-title">
      <a className="santa-rules-back" href="/">
        <ArrowLeft size={17} aria-hidden="true" /> {t("Torna alla home")}
      </a>
      <header className="santa-rules-intro">
        <div>
          <p className="santa-rules-kicker">
            {t("Dall’ufficio regali di Babbo Natale")}
          </p>
          <h1 id="santa-rules-title">{t("Il regolamento del Secret Santa")}</h1>
          <p>
            {t(
              "Ognuno prepara un regalo per la persona che ha pescato e ne riceve uno da qualcun altro. Tieni per te chi hai pescato fino allo scambio.",
            )}
          </p>
        </div>
        <div className="santa-rules-stamp">
          <Stamp size={25} aria-hidden="true" />
          <span>{t("Parola dell’elfo avvocato")}</span>
        </div>
      </header>
      <ol
        className="santa-rules-steps"
        aria-label={t("I sei passi del Secret Santa")}
        role="list"
      >
        {steps.map(({ id, title, text }, index) => (
          <li className="santa-rules-card" key={id}>
            <div className="santa-rules-art">
              <span className="santa-rules-number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <StepIllustration step={id} />
            </div>
            <div className="santa-rules-step-copy">
              <h2>{t(title)}</h2>
              <p>{t(text)}</p>
            </div>
          </li>
        ))}
      </ol>
      <aside className="santa-rules-note">
        <h2>{t("Un imprevisto?")}</h2>
        <p>
          {t(
            "Se non puoi venire o non hai ricevuto un nome, avvisa chi organizza. Troverete insieme un modo per far arrivare il regalo.",
          )}
        </p>
      </aside>
    </section>
  );
}
