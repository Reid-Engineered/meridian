(async () => {
  const invoke = window.__TAURI_INTERNALS__.invoke;
  const checks = [];
  const check = (name, condition) => { if (!condition) throw new Error(name); checks.push(name); };
  const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value==='object'
    ? Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])) : value;
  const same = (a,b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
  const list = () => invoke('list_books', {query:{}});
  try {
    const context = await invoke('smoke_context');
    const info = await invoke('get_app_info');
    const waitFor=async(predicate)=>{for(let i=0;i<180;i++){if(await predicate())return;await new Promise(resolve=>setTimeout(resolve,25));}throw new Error('Window state did not settle');};
    await waitFor(()=>document.querySelector('.windows-shell'));
    check('Windows uses theme-integrated chrome without native caption',!context.window.decorated && !!document.querySelector('.window-chrome'));
    check('Windows remains resizable',context.window.resizable);
    if(context.stage==='reopen'){
      document.querySelector('[aria-label="Maximize window"]').click();
      await waitFor(async()=> (await invoke('smoke_context')).window.maximized && !!document.querySelector('[aria-label="Restore window"]'));
      check('custom Maximize button maximizes the native window',true);
      document.querySelector('[aria-label="Restore window"]').click();
      await waitFor(async()=> !(await invoke('smoke_context')).window.maximized && !!document.querySelector('[aria-label="Maximize window"]'));
      check('custom Restore button restores the native window',true);
      document.querySelector('[aria-label="Minimize window"]').click();
      await waitFor(async()=> (await invoke('smoke_context')).window.minimized);
      check('custom Minimize button minimizes the native window',true);
      await invoke('smoke_context',{restoreWindow:true});
    }
    let book;
    if (context.stage === 'initial') {
      check('release first launch has an empty catalog', (await list()).length === 0);
      check('release has no seeded collections', (await invoke('list_collections')).length === 0);
      const first = await invoke('create_collection', {name:'Smoke favorites',description:'Keepers'});
      const second = await invoke('create_collection', {name:'Smoke reading',description:'Two shelves'});
      const cover=await invoke('import_cover',{path:context.coverSource});
      check('native cover import resizes and uses portable reference',cover.width===267 && cover.height===600 && cover.reference.startsWith('meridian-cover:'));
      const duplicate=await invoke('import_cover',{path:context.coverSource});
      check('native cover import shares identical processed images',duplicate.reference===cover.reference && (await invoke('get_cover_storage')).files===1);
      const input = {title:'Native smoke — 星',authors:['Jane Doe','李白'],format:'Paperback',status:'Reading',
        currentPage:42,pageCount:300,rating:4,isbn13:'9781234567897',tags:['favorite','日本語'],
        collectionIds:[first.id,second.id],notes:'Preserve this note',dateStarted:'2026-01-01',coverUrl:cover.reference};
      const created = await invoke('create_book', {input});
      check('native creation preserves ordered authors and relations', same(created.authors,input.authors) && created.collectionIds.length===2 && created.currentPage===42);
      book = await invoke('update_book', {id:created.id,input:{...input,title:'Revised native smoke — 星',notes:'Updated note'}});
      check('native update preserves metadata', book.title==='Revised native smoke — 星' && book.notes==='Updated note');
      let rejected=false;
      try { await invoke('update_book',{id:book.id,input:{...input,rating:6}}); } catch { rejected=true; }
      check('invalid native update rejects and rolls back', rejected && same(await invoke('get_book',{id:book.id}),book));
      check('native search finds author', (await invoke('list_books',{query:{search:'Jane Doe'}})).length===1);
      const renamed=await invoke('rename_collection',{id:first.id,name:'Renamed smoke favorites',description:'Keepers'});
      check('native collection rename',renamed.name==='Renamed smoke favorites');
      const exported=JSON.parse(await invoke('export_library'));
      check('native export preserves current catalog', same(exported.books[0],book) && exported.collections.length===2);
      await invoke('smoke_finish',{report:{passed:true,stage:context.stage,checks,info,book}});
    } else {
      book=context.expected.book;
      check('native process restart preserves all book fields',same(await invoke('get_book',{id:book.id}),book));
      const collections=await invoke('list_collections');
      check('native process restart preserves both collection memberships',collections.length===2 && collections.every(c=>c.bookCount===1));
      check('native statistics reflect persisted state',(await invoke('get_statistics')).reading===1);
      const source=await invoke('read_cover',{reference:book.coverUrl});
      check('managed cover survives source deletion and native process restart',source.startsWith('data:image/jpeg;base64,') && (await invoke('get_cover_storage')).files===1);
      const image=new Image();image.src=source;await image.decode();
      check('native WebView decodes the persisted managed cover',image.naturalWidth===267 && image.naturalHeight===600);
      if(context.stage==='scaled') {
        for(let frame=0;frame<120 && !document.querySelector('.mac-shell');frame++) await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
        check('200 percent native WebView zoom renders the application',!!document.querySelector('.mac-shell'));
        check('200 percent native WebView zoom activates compact navigation',innerWidth<=760 && getComputedStyle(document.querySelector('.mac-sidebar')).position==='fixed');
        check('200 percent native WebView zoom has no document horizontal overflow',document.documentElement.scrollWidth<=innerWidth+1);
        const add=document.querySelector('.add-round');
        check('200 percent native WebView zoom keeps Add book visible',!!add && getComputedStyle(add).display!=='none' && add.getBoundingClientRect().width>0);
        const controls=[...document.querySelectorAll('.window-controls button')];
        check('200 percent native WebView zoom keeps all Windows controls reachable',controls.length===3 && controls.every(button=>{const r=button.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth && r.bottom<=innerHeight && button.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2));}));
        add.click();await waitFor(()=>document.querySelector('[aria-modal="true"]'));
        check('Windows caption remains reachable above a modal edit sheet',controls.every(button=>{const r=button.getBoundingClientRect();return !button.closest('[inert]') && button.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2));}));
        document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
        await waitFor(()=>!document.querySelector('[aria-modal="true"]'));
        const settings=[...document.querySelectorAll('.sb-row')].find(button=>button.textContent.trim()==='Settings');settings.click();
        await waitFor(()=>document.querySelector('.theme-choice'));
        for(const theme of ['Dark','Light']){
          [...document.querySelectorAll('.theme-choice button')].find(button=>button.textContent.trim()===theme).click();
          await waitFor(()=>document.documentElement.dataset.theme===theme.toLowerCase());
          check(`Windows caption matches the ${theme.toLowerCase()} app theme`,getComputedStyle(document.querySelector('.window-chrome')).backgroundColor===getComputedStyle(document.querySelector('.mac-shell')).backgroundColor);
        }
      }
      if(context.stage==='cleanup') {
        const path=info.databasePath.replace(/library\.db$/,'smoke-portable.meridian.zip');
        await invoke('save_portable_backup',{path});
        const portable=await invoke('inspect_backup_file',{path});
        check('native portable archive contains managed covers',portable.coverFiles===1 && portable.coverBytes>0 && portable.summary.books===1);
        const backup=await invoke('create_backup');
        const summary=await invoke('inspect_backup',{json:backup});
        check('native backup validates full database snapshot',summary.books===1 && summary.collections===2 && summary.readingRecords===1);
        await invoke('save_backup',{path:info.databasePath.replace(/library\.db$/,'smoke-backup.json')});
        check('native backup save completes',true);
        let rejected=false;
        try {await invoke('restore_backup',{json:'{"version":99}'});}catch{rejected=true;}
        check('native invalid restore leaves library unchanged',rejected && same(await invoke('get_book',{id:book.id}),book));
        await invoke('delete_collection',{id:collections[0].id});
        check('deleting a collection keeps the owned copy and remaining membership',(await invoke('get_book',{id:book.id})).collectionIds.length===1);
        await invoke('delete_book',{id:book.id});
        check('native delete removes the owned copy',(await list()).length===0);
        await invoke('delete_collection',{id:collections[1].id});
        check('native collection cleanup',(await invoke('list_collections')).length===0);
        const restored=await invoke('restore_backup',{json:backup});
        check('native restore reports counts and automatic recovery file',restored.summary.books===1 && restored.recoveryPath.includes('before-restore-'));
        check('native restore returns the exact book graph',same(await invoke('get_book',{id:book.id}),book));
        check('native restore preserves all database records',same(JSON.parse(await invoke('create_backup')),JSON.parse(backup)));
        const restoredPortable=await invoke('restore_backup_file',{path,digest:portable.digest});
        check('native portable restore creates a complete recovery ZIP',restoredPortable.recoveryPath.endsWith('.meridian.zip'));
        check('native portable restore preserves catalog and cover rendering',same(await invoke('get_book',{id:book.id}),book) && (await invoke('read_cover',{reference:book.coverUrl}))===source);
        await invoke('delete_book',{id:book.id});
        for(const collection of await invoke('list_collections')) await invoke('delete_collection',{id:collection.id});
      }
      await invoke('smoke_finish',{report:{passed:true,stage:context.stage,checks,info,book,
        ...(context.stage==='scaled'?{layout:{width:innerWidth,height:innerHeight,zoom:2}}:{})}});
    }
  } catch (error) {
    await invoke('smoke_finish',{report:{passed:false,checks,error:String(error)}});
  }
})();
