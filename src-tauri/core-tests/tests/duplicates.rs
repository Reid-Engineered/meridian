use meridian_core_tests::{database,duplicates,domain::{BookInput,BookQuery},repositories::LibraryRepository as Repo,services::LibraryService};
fn input()->BookInput {serde_json::from_value(serde_json::json!({"title":"Dune","authors":["Frank Herbert"],"isbn13":"9780441172719","format":"Paperback","status":"Reading","currentPage":42,"notes":"Signed","tags":["favorite"],"collectionIds":[]})).unwrap()}
fn memory()->rusqlite::Connection {database::open(std::path::Path::new(":memory:")).unwrap()}

#[test] fn isbn_and_title_matching_handles_editions_and_legacy_data(){
  assert_eq!(duplicates::isbn("0-441-17271-7"),Some("9780441172719".into()));
  assert_eq!(duplicates::isbn("080442957x"),Some("9780804429573".into()));
  for invalid in ["9780441172718","0441172718","ééééé","", "000000000X"]{assert_eq!(duplicates::isbn(invalid),None);}
  let mut db=memory();let book=Repo::create(&mut db,&input()).unwrap();
  let mut i=input();i.isbn13=None;i.isbn10=Some("0441172717".into());i.title="Different title".into();
  assert_eq!(duplicates::find(&db,&i,None).unwrap()[0].reason,"isbn");
  assert!(duplicates::find(&db,&i,Some(book.id)).unwrap().is_empty());
  i.isbn10=None;i.title="  DUNE  ".into();i.authors=vec![" FRANK   HERBERT ".into()];i.format="Ebook".into();
  assert_eq!(duplicates::find(&db,&i,None).unwrap()[0].reason,"titleAuthor");
  i.authors=vec!["Other".into()];assert!(duplicates::find(&db,&i,None).unwrap().is_empty());
}
#[test] fn copies_have_independent_personal_fields_and_invalid_writes_roll_back(){
  let mut db=memory();let original=Repo::create(&mut db,&input()).unwrap();
  let mut i=input();i.title="Ignored edition change".into();i.notes=Some("Second copy".into());i.current_page=Some(9);
  let copy=Repo::create_copy(&mut db,original.id,&i).unwrap();
  assert_eq!(copy.title,original.title);assert_eq!(copy.notes,i.notes);assert_eq!(copy.current_page,Some(9));
  assert_eq!(Repo::get(&db,original.id).unwrap().current_page,Some(42));
  i.collection_ids=vec![999];assert!(Repo::create_copy(&mut db,original.id,&i).is_err());
  assert_eq!(Repo::list(&db,&BookQuery::default()).unwrap().len(),2);
  let editions:i64=db.query_row("SELECT count(*) FROM editions",[],|r|r.get(0)).unwrap();assert_eq!(editions,1);
}
#[test] fn merge_preserves_history_memberships_conflicts_and_disk_recovery(){
  let dir=tempfile::tempdir().unwrap();let path=dir.path().join("library.db");let mut db=database::open(&path).unwrap();
  let c=Repo::create_collection(&db,"Other shelf","").unwrap();let keep=Repo::create(&mut db,&input()).unwrap();
  let mut i=input();i.notes=Some("Other note".into());i.review=Some("Other review".into());i.tags=vec!["other".into()];i.collection_ids=vec![c.id];i.current_page=Some(7);
  let remove=Repo::create_copy(&mut db,keep.id,&i).unwrap();
  db.execute("INSERT INTO reading_records(copy_id,status,review) VALUES(?1,'Finished','Earlier review')",[remove.id]).unwrap();
  let service=LibraryService::new(db);let merged=service.merge_copies(keep.id,remove.id,&dir.path().join("recovery")).unwrap();
  assert_eq!(merged.current_page,Some(42));assert_eq!(merged.tags.len(),2);assert_eq!(merged.collection_ids,vec![c.id]);
  let notes=merged.notes.unwrap();for expected in ["Signed","Other note","Earlier review"]{assert!(notes.contains(expected));}
  assert!(service.get(remove.id).is_err());drop(service);
  let mut db=database::open(&path).unwrap();
  let count:i64=db.query_row("SELECT count(*) FROM reading_records WHERE copy_id=?1",[keep.id],|r|r.get(0)).unwrap();assert_eq!(count,4);
  for review in ["Other review","Earlier review"] {
    let preserved:i64=db.query_row("SELECT count(*) FROM reading_records WHERE copy_id=?1 AND review=?2",rusqlite::params![keep.id,review],|r|r.get(0)).unwrap();assert_eq!(preserved,1);
  }
  assert_eq!(db.query_row("PRAGMA integrity_check",[],|r|r.get::<_,String>(0)).unwrap(),"ok");
  let recovery=std::fs::read_dir(dir.path().join("recovery")).unwrap().next().unwrap().unwrap().path();
  meridian_core_tests::backup::restore(&mut db,&std::fs::read_to_string(recovery).unwrap(),&dir.path().join("restore-recovery")).unwrap();
  assert_eq!(Repo::list(&db,&BookQuery::default()).unwrap().len(),2);
}
#[test] fn merge_failure_preserves_both_entries_and_recovery_failure_prevents_merge(){
  let dir=tempfile::tempdir().unwrap();let mut db=memory();let a=Repo::create(&mut db,&input()).unwrap();let b=Repo::create_copy(&mut db,a.id,&input()).unwrap();
  db.execute_batch("CREATE TRIGGER fail_merge BEFORE DELETE ON library_copies BEGIN SELECT RAISE(ABORT,'injected'); END;").unwrap();
  assert!(Repo::merge_copies(&mut db,a.id,b.id).is_err());
  assert_eq!(Repo::list(&db,&BookQuery::default()).unwrap().len(),2);
  assert_eq!(Repo::get(&db,a.id).unwrap().notes,Some("Signed".into()));
  let blocked=dir.path().join("file");std::fs::write(&blocked,"block").unwrap();let service=LibraryService::new(db);
  assert!(service.merge_copies(a.id,b.id,&blocked).is_err());assert!(service.get(b.id).is_ok());
  let recovery=dir.path().join("recovery");assert!(service.merge_copies(a.id,b.id,&recovery).is_err());
  assert_eq!(std::fs::read_dir(recovery).unwrap().count(),1);assert!(service.get(a.id).is_ok());assert!(service.get(b.id).is_ok());
}
#[test] fn native_create_rejects_equivalent_isbns_and_deleted_books_can_be_added_again(){
  let service=LibraryService::new(memory());let a=service.create(&input()).unwrap();
  let mut other=input();other.isbn13=None;other.isbn10=Some("0-441-17271-7".into());other.title="New details".into();
  assert!(service.create(&other).unwrap_err().to_string().contains("add another copy"));
  service.delete(a.id).unwrap();
  let recreated=service.create(&other).unwrap();assert_eq!(recreated.title,"New details");
}
