import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { coverReadiness } from '../services/library';

/** Reuse decoded covers synchronously on remount; cold offscreen covers wait until nearby. */
export function CoverImage({reference,alt='',eager=false}:{reference:string;alt?:string;eager?:boolean}) {
  const version=useSyncExternalStore(coverReadiness.subscribe,coverReadiness.version);
  const [resolved,setResolved]=useState<{reference:string;src:string;version:number}|null>(null);
  const [failed,setFailed]=useState<{reference:string;version:number}|null>(null);
  const placeholder=useRef<HTMLSpanElement>(null);
  const cached=coverReadiness.peek(reference);
  const src=cached||(resolved?.reference===reference&&resolved.version===version?resolved.src:undefined);
  useEffect(()=>{
    let active=true;
    if(src)return;
    const load=()=>{void coverReadiness.load(reference).then(
      value=>{if(active)setResolved({reference,src:value,version})},
      ()=>{if(active)setFailed({reference,version})}
    );};
    let observer:IntersectionObserver|undefined;
    if(eager||typeof IntersectionObserver==='undefined')load();
    else if(placeholder.current){
      observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer?.disconnect();load();}},{rootMargin:'300px'});
      observer.observe(placeholder.current);
    }
    return()=>{active=false;observer?.disconnect()};
  },[reference,version,eager,src]);
  if(failed?.reference===reference&&failed.version===version)return <span className="cover-unavailable" role="img" aria-label={alt||'Cover unavailable'}>Cover unavailable</span>;
  if(!src)return <span ref={placeholder} className="cover-unavailable" aria-label="Loading cover">Loading cover…</span>;
  return <img src={src} alt={alt} loading="eager" onError={()=>{coverReadiness.forget(reference);setFailed({reference,version})}}/>;
}
