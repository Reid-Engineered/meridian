import { useEffect, useState } from 'react';
import { libraryService } from '../services/library';

/** Stored references are resolved through the same native boundary on every surface. */
export function CoverImage({reference,alt=''}:{reference:string;alt?:string}) {
  const managed=reference.startsWith('meridian-cover:');
  const [resolved,setResolved]=useState<{reference:string;src:string}|null>(null);
  const [failed,setFailed]=useState<string|null>(null);
  useEffect(()=>{
    let active=true;setFailed(null);
    if(managed)libraryService.resolveCover(reference).then(src=>{if(active)setResolved({reference,src})},()=>{if(active)setFailed(reference)});
    return()=>{active=false};
  },[reference,managed]);
  if(failed===reference)return <span className="cover-unavailable" role="img" aria-label={alt||'Cover unavailable'}>Cover unavailable</span>;
  const src=managed?(resolved?.reference===reference?resolved.src:undefined):reference;
  if(!src)return <span className="cover-unavailable" aria-label="Loading cover">Loading cover…</span>;
  return <img src={src} alt={alt} loading="lazy" onError={()=>setFailed(reference)}/>;
}
