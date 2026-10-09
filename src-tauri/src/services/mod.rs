use std::sync::Mutex;
use rusqlite::Connection;
use crate::{domain::{BookDetail,BookInput,BookQuery,Collection,Statistics},error::{AppError,AppResult},repositories::LibraryRepository};

pub struct LibraryService { conn: Mutex<Connection> }
impl LibraryService {
  pub fn new(conn:Connection)->Self{Self{conn:Mutex::new(conn)}}
  fn db(&self)->AppResult<std::sync::MutexGuard<'_,Connection>>{self.conn.lock().map_err(|_|AppError::Storage)}
  pub fn list(&self,q:&BookQuery)->AppResult<Vec<BookDetail>>{let db=self.db()?;LibraryRepository::list(&db,q)}
  pub fn get(&self,id:i64)->AppResult<BookDetail>{let db=self.db()?;LibraryRepository::get(&db,id)}
  pub fn create(&self,input:&BookInput)->AppResult<BookDetail>{let mut db=self.db()?;LibraryRepository::create(&mut db,input)}
  pub fn update(&self,id:i64,input:&BookInput)->AppResult<BookDetail>{let mut db=self.db()?;LibraryRepository::update(&mut db,id,input)}
  pub fn delete(&self,id:i64)->AppResult<()> {let db=self.db()?;LibraryRepository::delete(&db,id)}
  pub fn collections(&self)->AppResult<Vec<Collection>>{let db=self.db()?;LibraryRepository::collections(&db)}
  pub fn create_collection(&self,n:&str,d:&str)->AppResult<Collection>{let db=self.db()?;LibraryRepository::create_collection(&db,n,d)}
  pub fn rename_collection(&self,id:i64,n:&str,d:&str)->AppResult<Collection>{let db=self.db()?;LibraryRepository::rename_collection(&db,id,n,d)}
  pub fn delete_collection(&self,id:i64)->AppResult<()> {let db=self.db()?;LibraryRepository::delete_collection(&db,id)}
  pub fn statistics(&self)->AppResult<Statistics>{let db=self.db()?;LibraryRepository::statistics(&db)}
  pub fn export_catalog(&self)->AppResult<String>{
    let mut db=self.db()?;let tx=db.transaction()?;
    let books=LibraryRepository::list(&tx,&BookQuery::default())?;
    let collections=LibraryRepository::collections(&tx)?;
    let json=serde_json::to_string_pretty(&serde_json::json!({"version":1,"books":books,"collections":collections}))?;
    tx.commit()?;Ok(json)
  }
  pub fn backup(&self)->AppResult<String>{let mut db=self.db()?;crate::backup::export(&mut db)}
  pub fn restore(&self,json:&str,covers:&std::path::Path,directory:&std::path::Path)->AppResult<crate::backup::RestoreResult>{let mut db=self.db()?;crate::portable::restore_json(&mut db,covers,json,directory)}
  pub fn save_portable(&self,covers:&std::path::Path,path:&std::path::Path)->AppResult<()> {let mut db=self.db()?;crate::portable::save(&mut db,covers,path)}
  pub fn restore_portable(&self,covers:&std::path::Path,path:&std::path::Path,digest:&str,recovery:&std::path::Path)->AppResult<crate::backup::RestoreResult>{let mut db=self.db()?;crate::portable::restore(&mut db,covers,path,digest,recovery)}
}

pub fn seed_development(conn:&mut Connection)->AppResult<()> {
  let tx=conn.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
  let count:i64=tx.query_row("SELECT count(*) FROM library_copies",[],|r|r.get(0))?;if count>0{return Ok(())}
  let existing=LibraryRepository::collections(&tx)?;
  let mut seeded_collection_ids=vec![];
  for (name,description) in [("Science Fiction","Worlds beyond our own"),("Favorites","The keepers"),("Read in 2026","This year's journey")] {
    let id=if let Some(collection)=existing.iter().find(|c|c.name.eq_ignore_ascii_case(name)){collection.id}else{LibraryRepository::create_collection(&tx,name,description)?.id};
    seeded_collection_ids.push(id);
  }
  let samples=[
    ("Dune","Frank Herbert",1965,"Reading",Some(5),"Paperback","/covers/dune.svg",vec![1,2]),
    ("The Left Hand of Darkness","Ursula K. Le Guin",1969,"Finished",Some(5),"Paperback","/covers/left-hand.svg",vec![1,2,3]),
    ("The Hobbit","J. R. R. Tolkien",1937,"Finished",Some(5),"Hardcover","/covers/hobbit.svg",vec![2,3]),
    ("1984","George Orwell",1949,"Finished",Some(4),"Mass Market Paperback","/covers/1984.svg",vec![3]),
    ("Neuromancer","William Gibson",1984,"Want to Read",None,"Paperback","/covers/neuromancer.svg",vec![1]),
    ("The Martian","Andy Weir",2014,"Finished",Some(4),"Ebook","/covers/martian.svg",vec![1,3]),
    ("Frankenstein","Mary Shelley",1818,"Unread",None,"Hardcover","/covers/frankenstein.svg",vec![]),
    ("Foundation","Isaac Asimov",1951,"Want to Read",None,"Paperback","/covers/foundation.svg",vec![1]),
    ("The Dispossessed","Ursula K. Le Guin",1974,"Reading",Some(4),"Paperback","/covers/dispossessed.svg",vec![1]),
    ("A Brief History of Time","Stephen Hawking",1988,"Did Not Finish",Some(3),"Hardcover","/covers/brief-history.svg",vec![])
  ];
  for (title,author,year,status,rating,format,cover,collection_ids) in samples {let input=BookInput{title:title.into(),subtitle:None,authors:vec![author.into()],description:None,publication_year:Some(year),series:None,series_position:None,isbn10:None,isbn13:None,publisher:None,page_count:Some(300),language:Some("English".into()),format:format.into(),status:status.into(),current_page:if status=="Reading"{Some(100)}else{None},rating,cover_url:Some(cover.into()),tags:if collection_ids.contains(&1){vec!["science fiction".into()]}else{vec![]},collection_ids:collection_ids.iter().map(|id|seeded_collection_ids[(*id as usize)-1]).collect(),location:Some("Living Room · Shelf A".into()),condition:Some("Very Good".into()),notes:None,review:None,date_acquired:None,date_started:None,date_finished:if status=="Finished"{Some("2026-02-12".into())}else{None}};LibraryRepository::insert_graph(&tx,&input)?;}tx.commit()?;Ok(())
}
