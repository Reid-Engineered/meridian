import { useId } from "react";
import { useModalFocus } from "./useModalFocus";

export function ConfirmDialog({title,body,confirm,onConfirm,onClose,busy=false}:{title:string;body:string;confirm:string;onConfirm:()=>void;onClose:()=>void;busy?:boolean}){
  const id = useId();
  const close=()=>{if(!busy)onClose()};
  const ref = useModalFocus<HTMLDivElement>(close);
  return <div ref={ref} className="modal-backdrop" role="presentation" onMouseDown={e=>e.target===e.currentTarget&&close()}><section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-busy={busy} aria-labelledby={`${id}-title`} aria-describedby={`${id}-body`} tabIndex={-1}><span className="confirm-icon">!</span><h2 id={`${id}-title`}>{title}</h2><p id={`${id}-body`}>{body}</p><div className="form-actions"><button data-modal-initial className="button secondary" disabled={busy} onClick={close}>Cancel</button><button className="button danger" disabled={busy} onClick={onConfirm}>{busy?"Restoring…":confirm}</button></div></section></div>
}
