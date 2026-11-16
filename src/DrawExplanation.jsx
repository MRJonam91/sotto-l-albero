export default function DrawExplanation() {
  return (
    <details className="draw-method">
      <summary>Come scegliamo i nomi</summary>
      <p>
        Mescoliamo i nomi con un generatore casuale crittografico. Ogni
        combinazione valida ha la stessa possibilità di uscire durante il
        sorteggio. Ciascuno fa un regalo a un’altra persona e ne riceve uno.
      </p>
      <p>
        Se le regole lasciano poche combinazioni e il sorteggio fatica a
        trovarne una, cerchiamo un abbinamento completo rispettando le stesse
        regole.
      </p>
    </details>
  );
}
