// Local demonstration model: no storage, network or inferred preferences.
(()=>{
  const cards=new Map();
  const allowed=new Set(['c1','c2','c3','c4','c5']);
  const changed=()=>document.dispatchEvent(new CustomEvent('winter:profile'));
  window.WinterProfile={
    save({game,text,meaning='',evidence=''}){
      if(!allowed.has(game)||typeof text!=='string'||!text.trim())return false;
      cards.set(game,{game,text:text.trim().slice(0,1000),meaning:String(meaning).slice(0,100),evidence:String(evidence).slice(0,1200)});
      changed();return true;
    },
    remove(game){if(cards.delete(game))changed();},
    clear(){cards.clear();changed();},
    list(){return [...cards.values()].map(card=>({...card}));}
  };
})();
