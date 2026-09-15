import { BookOpen, BookmarkCheck, Library, Star } from "lucide-react";
import type { Statistics } from "../types";

function Bars({data,color="clay"}:{data:{label:string;value:number}[];color?:string}){const max=Math.max(1,...data.map(x=>x.value));return <div className="bars">{data.map(d=><div key={d.label}><span>{d.label}</span><i><b className={color} style={{width:`${d.value/max*100}%`}}/></i><strong>{d.value}</strong></div>)}</div>}
export function StatisticsPage({stats}:{stats:Statistics|null}){
  if(!stats)return <div className="page"><div className="stats-skeleton"/></div>;
  const maxActivity=Math.max(1,...stats.activity.map(x=>x.value));
  return <div className="page statistics-page"><section className="stat-cards"><article><span><Library/></span><div><small>Total books</small><strong>{stats.totalBooks}</strong><p>in your library</p></div></article><article><span><BookmarkCheck/></span><div><small>Finished this year</small><strong>{stats.finishedThisYear}</strong><p>{stats.finished} all time</p></div></article><article><span><BookOpen/></span><div><small>Pages read</small><strong>{stats.pagesRead.toLocaleString()}</strong><p>from finished books</p></div></article><article><span><Star/></span><div><small>Average rating</small><strong>{stats.averageRating?.toFixed(1)??"—"}</strong><p>across rated books</p></div></article></section>
    <section className="stats-layout"><article className="chart-card activity-card"><header><div><h3>Reading activity</h3><p>Books finished in {new Date().getFullYear()}</p></div></header><div className="activity-chart">{stats.activity.map(d=><div key={d.label}><span>{d.value||""}</span><i><b style={{height:`${Math.max(4,d.value/maxActivity*100)}%`}}/></i><small>{d.label}</small></div>)}</div></article>
      <article className="chart-card"><header><div><h3>Reading status</h3><p>Where your books stand</p></div></header><Bars data={stats.statusCounts} color="blue"/></article>
      <article className="chart-card"><header><div><h3>By format</h3><p>How you like to read</p></div></header><Bars data={stats.formatCounts}/></article>
      <article className="chart-card"><header><div><h3>Most-read authors</h3><p>Authors with the largest presence</p></div></header><ol className="author-list">{stats.topAuthors.map((a,i)=><li key={a.label}><span>{i+1}</span><strong>{a.label}</strong><small>{a.value} {a.value===1?"book":"books"}</small></li>)}</ol></article>
    </section></div>;
}
