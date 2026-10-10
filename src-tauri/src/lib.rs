mod duplicates;mod covers;mod portable;mod backup;mod commands;mod database;mod domain;mod error;mod metadata;mod repositories;mod services;mod state;
use tauri::Manager;
#[cfg(feature="smoke-test")] mod smoke;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run(){
  let builder=tauri::Builder::default().plugin(tauri_plugin_dialog::init()).setup(|app|{
    #[cfg(feature="smoke-test")] let test=smoke::configuration()?;
    #[cfg(feature="smoke-test")] let data=test.directory.clone();
    #[cfg(not(feature="smoke-test"))] let data=app.path().app_data_dir().map_err(|_|std::io::Error::new(std::io::ErrorKind::NotFound,"Application data directory unavailable"))?;std::fs::create_dir_all(&data)?;let covers=data.join("covers");std::fs::create_dir_all(&covers)?;let db_path=data.join("library.db");let mut conn=database::open(&db_path)?;
    #[cfg(all(debug_assertions,not(feature="smoke-test")))] services::seed_development(&mut conn)?;
    #[cfg(feature="smoke-test")] app.manage(test);
    app.manage(state::AppState{library:std::sync::Arc::new(services::LibraryService::new(conn)),database_path:db_path,covers_path:covers});Ok(())
  });
  #[cfg(feature="smoke-test")] let builder=builder.on_page_load(smoke::start).invoke_handler(tauri::generate_handler![smoke::smoke_context,smoke::smoke_finish,commands::list_books,commands::get_book,commands::create_book,commands::update_book,commands::delete_book,commands::find_duplicates,commands::create_book_copy,commands::merge_book_copies,commands::list_collections,commands::create_collection,commands::rename_collection,commands::delete_collection,commands::get_statistics,commands::lookup_isbn,commands::get_app_info,commands::export_library,commands::create_backup,commands::save_backup,commands::inspect_backup,commands::restore_backup,commands::import_cover,commands::read_cover,commands::get_cover_storage,commands::save_portable_backup,commands::inspect_backup_file,commands::restore_backup_file]);
  #[cfg(not(feature="smoke-test"))] let builder=builder.invoke_handler(tauri::generate_handler![commands::list_books,commands::get_book,commands::create_book,commands::update_book,commands::delete_book,commands::find_duplicates,commands::create_book_copy,commands::merge_book_copies,commands::list_collections,commands::create_collection,commands::rename_collection,commands::delete_collection,commands::get_statistics,commands::lookup_isbn,commands::get_app_info,commands::export_library,commands::create_backup,commands::save_backup,commands::inspect_backup,commands::restore_backup,commands::import_cover,commands::read_cover,commands::get_cover_storage,commands::save_portable_backup,commands::inspect_backup_file,commands::restore_backup_file]);
  let context=tauri::generate_context!();
  // Configure before creating the window, avoiding a flash of the Windows title bar.
  #[cfg(windows)] let context={let mut context=context;for window in &mut context.config_mut().app.windows{window.decorations=false;}context};
  builder.run(context).expect("Meridian failed to start");
}

#[cfg(test)] mod tests{
  use super::{database,domain::{BookInput,BookQuery},repositories::LibraryRepository};
  fn input()->BookInput{BookInput{title:"The Test Book".into(),subtitle:None,authors:vec!["Ada Author".into(),"Ben Writer".into()],description:Some("A test".into()),publication_year:Some(2026),series:None,series_position:None,isbn10:None,isbn13:Some("9781234567897".into()),publisher:Some("Test Press".into()),page_count:Some(300),language:Some("English".into()),format:"Hardcover".into(),status:"Reading".into(),current_page:Some(42),rating:Some(4),cover_url:None,tags:vec!["technical".into(),"favorite".into()],collection_ids:vec![],location:Some("Shelf A".into()),condition:Some("New".into()),notes:Some("Signed".into()),review:None,date_acquired:None,date_started:Some("2026-01-01".into()),date_finished:None}}
  #[test] fn book_crud_relations_and_search(){let mut db=database::memory().unwrap();let collection=LibraryRepository::create_collection(&db,"Favorites","Keepers").unwrap();let mut i=input();i.collection_ids=vec![collection.id];let created=LibraryRepository::create(&mut db,&i).unwrap();assert_eq!(created.authors.len(),2);assert_eq!(created.tags.len(),2);assert_eq!(created.collection_ids,vec![collection.id]);let found=LibraryRepository::list(&db,&BookQuery{search:Some("Ada".into()),..Default::default()}).unwrap();assert_eq!(found.len(),1);i.title="Updated Title".into();i.status="Finished".into();i.date_finished=Some("2026-03-01".into());let updated=LibraryRepository::update(&mut db,created.id,&i).unwrap();assert_eq!(updated.title,"Updated Title");assert_eq!(updated.status,"Finished");LibraryRepository::delete(&db,created.id).unwrap();assert!(LibraryRepository::get(&db,created.id).is_err());}
  #[test] fn constraints_reject_invalid_rating(){let mut db=database::memory().unwrap();let mut i=input();i.rating=Some(6);assert!(LibraryRepository::create(&mut db,&i).is_err());}
  #[test] fn collections_are_many_to_many(){let mut db=database::memory().unwrap();let a=LibraryRepository::create_collection(&db,"A","").unwrap();let b=LibraryRepository::create_collection(&db,"B","").unwrap();let mut i=input();i.collection_ids=vec![a.id,b.id];let book=LibraryRepository::create(&mut db,&i).unwrap();assert_eq!(book.collection_ids.len(),2);LibraryRepository::delete_collection(&db,a.id).unwrap();assert_eq!(LibraryRepository::get(&db,book.id).unwrap().collection_ids,vec![b.id]);}
}
