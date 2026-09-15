mod commands;mod database;mod domain;mod error;mod metadata;mod repositories;mod services;mod state;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run(){
  tauri::Builder::default().plugin(tauri_plugin_dialog::init()).setup(|app|{
    let data=app.path().app_data_dir().map_err(|_|std::io::Error::new(std::io::ErrorKind::NotFound,"Application data directory unavailable"))?;std::fs::create_dir_all(&data)?;let covers=data.join("covers");std::fs::create_dir_all(&covers)?;let db_path=data.join("library.db");let mut conn=database::open(&db_path)?;
    #[cfg(debug_assertions)] services::seed_development(&mut conn)?;
    app.manage(state::AppState{library:services::LibraryService::new(conn),database_path:db_path,covers_path:covers});Ok(())
  }).invoke_handler(tauri::generate_handler![commands::list_books,commands::get_book,commands::create_book,commands::update_book,commands::delete_book,commands::list_collections,commands::create_collection,commands::rename_collection,commands::delete_collection,commands::get_statistics,commands::lookup_isbn,commands::get_app_info,commands::export_library]).run(tauri::generate_context!()).expect("Meridian failed to start");
}

#[cfg(test)] mod tests{
  use super::{database,domain::{BookInput,BookQuery},repositories::LibraryRepository};
  fn input()->BookInput{BookInput{title:"The Test Book".into(),subtitle:None,authors:vec!["Ada Author".into(),"Ben Writer".into()],description:Some("A test".into()),publication_year:Some(2026),series:None,series_position:None,isbn10:None,isbn13:Some("9781234567897".into()),publisher:Some("Test Press".into()),page_count:Some(300),language:Some("English".into()),format:"Hardcover".into(),status:"Reading".into(),current_page:Some(42),rating:Some(4),cover_url:None,tags:vec!["technical".into(),"favorite".into()],collection_ids:vec![],location:Some("Shelf A".into()),condition:Some("New".into()),notes:Some("Signed".into()),review:None,date_acquired:None,date_started:Some("2026-01-01".into()),date_finished:None}}
  #[test] fn book_crud_relations_and_search(){let mut db=database::memory().unwrap();let collection=LibraryRepository::create_collection(&db,"Favorites","Keepers").unwrap();let mut i=input();i.collection_ids=vec![collection.id];let created=LibraryRepository::create(&mut db,&i).unwrap();assert_eq!(created.authors.len(),2);assert_eq!(created.tags.len(),2);assert_eq!(created.collection_ids,vec![collection.id]);let found=LibraryRepository::list(&db,&BookQuery{search:Some("Ada".into()),..Default::default()}).unwrap();assert_eq!(found.len(),1);i.title="Updated Title".into();i.status="Finished".into();i.date_finished=Some("2026-03-01".into());let updated=LibraryRepository::update(&mut db,created.id,&i).unwrap();assert_eq!(updated.title,"Updated Title");assert_eq!(updated.status,"Finished");LibraryRepository::delete(&db,created.id).unwrap();assert!(LibraryRepository::get(&db,created.id).is_err());}
  #[test] fn constraints_reject_invalid_rating(){let mut db=database::memory().unwrap();let mut i=input();i.rating=Some(6);assert!(LibraryRepository::create(&mut db,&i).is_err());}
  #[test] fn collections_are_many_to_many(){let mut db=database::memory().unwrap();let a=LibraryRepository::create_collection(&db,"A","").unwrap();let b=LibraryRepository::create_collection(&db,"B","").unwrap();let mut i=input();i.collection_ids=vec![a.id,b.id];let book=LibraryRepository::create(&mut db,&i).unwrap();assert_eq!(book.collection_ids.len(),2);LibraryRepository::delete_collection(&db,a.id).unwrap();assert_eq!(LibraryRepository::get(&db,book.id).unwrap().collection_ids,vec![b.id]);}
}
