/** Isolated per-repository site database ("WLC.DB"): shared limits + the browser client injected into generated sites. */
export const SITE_DB_LIMITS = { maxRecordBytes: 16_000, maxRecordsPerSite: 5_000, listLimit: 200 } as const;
export const COLLECTION_RE = /^[a-z][a-z0-9_]{0,39}$/;

export function siteDbScript(apiOrigin: string, siteKey: string): string {
  const cfg = JSON.stringify({ url: `${apiOrigin}/api/public/site-db/${siteKey}` });
  return `<script>(function(){var C=${cfg};function req(c,m,b){return fetch(C.url+"/"+c,{method:m,headers:{"content-type":"application/json"},body:b?JSON.stringify(b):undefined}).then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.error||"Erro no banco");return j;});});}
window.WlcDB=function(){return{collection:function(n){return{list:function(){return req(n,"GET").then(function(j){return j.records;});},create:function(d){return req(n,"POST",{data:d}).then(function(j){return j.record;});}};}};};window.wlcDb=new window.WlcDB();})();<\/script>`;
}

export function injectSiteDb(html: string, apiOrigin: string, siteKey: string): string {
  const tag = siteDbScript(apiOrigin, siteKey);
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (h) => h + tag) : tag + html;
}
