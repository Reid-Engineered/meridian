#[path = "../../src/domain/mod.rs"] mod domain;
#[path = "../../src/error.rs"] mod error;
#[path = "../../src/repositories/mod.rs"] mod repositories;

#[cfg(test)] mod tests {
    use rusqlite::Connection;
    use super::{domain::{BookInput,BookQuery},repositories::LibraryRepository};
    fn db()->Connection{let conn=Connection::open_in_memory().unwrap();conn.execute_batch(include_str!("../../migrations/001_initial.sql")).unwrap();conn}
    fn input()->BookInput{BookInput{title:"The Test Book".into(),subtitle:None,authors:vec!["Ada Author".into(),"Ben Writer".into()],description:Some("A test".into()),publication_year:Some(2026),series:None,series_position:None,isbn10:None,isbn13:Some("9781234567897".into()),publisher:Some("Test Press".into()),page_count:Some(300),language:Some("English".into()),format:"Hardcover".into(),status:"Reading".into(),current_page:Some(42),rating:Some(4),cover_url:None,tags:vec!["technical".into(),"favorite".into()],collection_ids:vec![],location:Some("Shelf A".into()),condition:Some("New".into()),notes:Some("Signed".into()),review:None,date_acquired:None,date_started:Some("2026-01-01".into()),date_finished:None}}
    #[test] fn crud_relations_search_and_reading_state(){let mut db=db();let c=LibraryRepository::create_collection(&db,"Favorites","Keepers").unwrap();let mut i=input();i.collection_ids=vec![c.id];let created=LibraryRepository::create(&mut db,&i).unwrap();assert_eq!(created.authors.len(),2);assert_eq!(created.tags.len(),2);assert_eq!(LibraryRepository::list(&db,&BookQuery{search:Some("Ada".into()),..Default::default()}).unwrap().len(),1);i.title="Updated".into();i.status="Finished".into();i.date_finished=Some("2026-03-01".into());let updated=LibraryRepository::update(&mut db,created.id,&i).unwrap();assert_eq!(updated.status,"Finished");LibraryRepository::delete(&db,created.id).unwrap();assert!(LibraryRepository::get(&db,created.id).is_err())}
    #[test] fn constraints_reject_invalid_rating(){let mut db=db();let mut i=input();i.rating=Some(6);assert!(LibraryRepository::create(&mut db,&i).is_err())}
    #[test] fn collection_membership_is_many_to_many(){let mut db=db();let a=LibraryRepository::create_collection(&db,"A","").unwrap();let b=LibraryRepository::create_collection(&db,"B","").unwrap();let mut i=input();i.collection_ids=vec![a.id,b.id];let book=LibraryRepository::create(&mut db,&i).unwrap();assert_eq!(book.collection_ids.len(),2);LibraryRepository::delete_collection(&db,a.id).unwrap();assert_eq!(LibraryRepository::get(&db,book.id).unwrap().collection_ids,vec![b.id])}
}
