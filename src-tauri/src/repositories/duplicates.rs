use super::*;

impl LibraryRepository {
  pub(super) fn release_orphan_isbns(tx:&Transaction,input:&BookInput)->AppResult<()> {
    if ![input.isbn10.as_ref(),input.isbn13.as_ref()].iter().flatten().any(|s|!s.trim().is_empty()){return Ok(());}
    let mut statement=tx.prepare("SELECT e.id,e.isbn10,e.isbn13 FROM editions e WHERE NOT EXISTS(SELECT 1 FROM library_copies c WHERE c.edition_id=e.id)")?;
    let rows=statement.query_map([],|r|Ok((r.get::<_,i64>(0)?,r.get::<_,Option<String>>(1)?,r.get::<_,Option<String>>(2)?)))?.collect::<Result<Vec<_>,_>>()?;
    drop(statement);
    for (id,i10,i13) in rows {
      if crate::duplicates::same_isbn(&[input.isbn10.clone(),input.isbn13.clone()],&[i10,i13]) {
        tx.execute("DELETE FROM editions WHERE id=?1",[id])?;
      }
    }
    Ok(())
  }
  pub fn create_copy(conn:&mut Connection, source:i64, input:&BookInput)->AppResult<BookDetail>{
    let tx=conn.transaction()?;
    let edition:i64=tx.query_row("SELECT edition_id FROM library_copies WHERE id=?1",[source],|r|r.get(0)).optional()?.ok_or(AppError::NotFound)?;
    tx.execute("INSERT INTO library_copies(edition_id,physical_location,date_acquired,condition,notes) VALUES(?1,?2,?3,?4,?5)",params![edition,clean(&input.location),clean(&input.date_acquired),clean(&input.condition),clean(&input.notes)])?;
    let id=tx.last_insert_rowid();
    tx.execute("INSERT INTO reading_records(copy_id,status,current_page,date_started,date_finished,rating,review) VALUES(?1,?2,?3,?4,?5,?6,?7)",params![id,input.status,input.current_page,clean(&input.date_started),clean(&input.date_finished),input.rating,clean(&input.review)])?;
    Self::replace_tags(&tx,id,&input.tags)?; Self::replace_collections(&tx,id,&input.collection_ids)?;
    tx.commit()?;Self::get(conn,id)
  }
  pub fn merge_copies(conn:&mut Connection,keep:i64,remove:i64)->AppResult<BookDetail>{
    let tx=conn.transaction()?;
    Self::merge_in_transaction(&tx,keep,remove)?;
    tx.commit()?;Self::get(conn,keep)
  }
  pub(crate) fn merge_in_transaction(tx:&Transaction,keep:i64,remove:i64)->AppResult<()> {
    if keep==remove {return Err(AppError::InvalidOperation("Choose two different library entries.".into()));}
    let kept=Self::get(&tx,keep)?;let removed=Self::get(&tx,remove)?;
    // Keep the selected copy's current reading state while retaining every old session.
    let current:Option<i64>=tx.query_row("SELECT id FROM reading_records WHERE copy_id=?1 ORDER BY id DESC LIMIT 1",[keep],|r|r.get(0)).optional()?;
    tx.execute("UPDATE reading_records SET copy_id=?1 WHERE copy_id=?2",params![keep,remove])?;
    if let Some(id)=current {
      tx.execute("INSERT INTO reading_records(copy_id,status,current_page,date_started,date_finished,rating,review,created_at) SELECT copy_id,status,current_page,date_started,date_finished,rating,review,created_at FROM reading_records WHERE id=?1",[id])?;
    }
    tx.execute("INSERT OR IGNORE INTO copy_tags(copy_id,tag_id) SELECT ?1,tag_id FROM copy_tags WHERE copy_id=?2",params![keep,remove])?;
    tx.execute("INSERT OR IGNORE INTO collection_copies(collection_id,copy_id,position) SELECT collection_id,?1,position FROM collection_copies WHERE copy_id=?2",params![keep,remove])?;
    // Archive all discarded metadata as well as notes, so conflicts and cover references remain recoverable.
    let notes=format!("{}\n\nMerged entry #{}: {}\n{}\n\nOriginal entry details:\n{}", kept.notes.unwrap_or_default(),remove,removed.title,removed.notes.clone().unwrap_or_default(),serde_json::to_string_pretty(&removed)?);
    tx.execute("UPDATE library_copies SET notes=?1 WHERE id=?2",params![notes.trim(),keep])?;
    tx.execute("DELETE FROM library_copies WHERE id=?1",[remove])?;
    Ok(())
  }
}
