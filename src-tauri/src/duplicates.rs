//! Matching is advisory: an ISBN identifies an edition, never an owned copy.
use crate::{domain::{BookInput, BookDetail}, error::AppResult, repositories::LibraryRepository};
use rusqlite::Connection;
use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all="camelCase")]
pub struct DuplicateMatch { pub book: BookDetail, pub reason: String }

pub fn text(value: &str) -> String { value.split_whitespace().collect::<Vec<_>>().join(" ").to_lowercase() }
pub fn isbn(value: &str) -> Option<String> {
    let s: String = value.chars().filter(|c| !c.is_whitespace() && *c != '-').flat_map(char::to_uppercase).collect();
    if !s.is_ascii() { return None; }
    let digits: Vec<u32> = s.chars().map(|c| c.to_digit(10).unwrap_or(99)).collect();
    if s.len() == 13 && digits.iter().all(|d| *d < 10) && digits.iter().enumerate().map(|(i,d)| d * if i%2==0 {1} else {3}).sum::<u32>()%10 == 0 { return Some(s); }
    if s.len() == 10 {
        let mut d = digits;
        if s.ends_with('X') { d[9]=10; }
        if d[..9].iter().all(|v| *v<10) && d[9]<=10 && d.iter().enumerate().map(|(i,v)| v*(10-i as u32)).sum::<u32>()%11==0 {
            let prefix=format!("978{}", &s[..9]);
            let sum:u32=prefix.chars().enumerate().map(|(i,c)| c.to_digit(10).unwrap()*if i%2==0 {1} else {3}).sum();
            return Some(format!("{prefix}{}", (10-sum%10)%10));
        }
    }
    None
}
pub fn same_isbn(a: &[Option<String>], b: &[Option<String>]) -> bool {
    a.iter().flatten().filter_map(|s| isbn(s)).any(|x| b.iter().flatten().filter_map(|s| isbn(s)).any(|y| x==y)) ||
    // Legacy invalid identifiers still warn on identical spelling, without pretending they are validated ISBNs.
    a.iter().flatten().filter(|s| !s.trim().is_empty()).any(|x| b.iter().flatten().any(|y| text(x).replace('-', "")==text(y).replace('-', "")))
}
pub fn find(db: &Connection, input: &BookInput, exclude: Option<i64>) -> AppResult<Vec<DuplicateMatch>> {
    let mut statement=db.prepare("SELECT c.id,w.title,e.isbn10,e.isbn13 FROM library_copies c JOIN editions e ON e.id=c.edition_id JOIN works w ON w.id=e.work_id ORDER BY c.id")?;
    let rows=statement.query_map([], |r| Ok((r.get::<_,i64>(0)?,r.get::<_,String>(1)?,r.get::<_,Option<String>>(2)?,r.get::<_,Option<String>>(3)?)))?;
    let mut matches=Vec::new();
    for row in rows {
        let (id,title,i10,i13)=row?;
        if Some(id)==exclude {continue;}
        let exact=same_isbn(&[input.isbn10.clone(),input.isbn13.clone()], &[i10,i13]);
        if !exact && text(&title)!=text(&input.title) {continue;}
        let book=LibraryRepository::get(db,id)?;
        if exact || input.authors.iter().any(|a| !text(a).is_empty() && book.authors.iter().any(|b| text(a)==text(b))) {
            matches.push(DuplicateMatch{book,reason:if exact {"isbn"} else {"titleAuthor"}.into()});
        }
    }
    matches.sort_by_key(|m| if m.reason=="isbn" {0} else {1});
    Ok(matches)
}
