use serde::Deserialize;
use crate::{domain::MetadataResult,error::{AppError,AppResult}};

#[derive(Deserialize)] struct OpenLibraryResponse { #[serde(default)] docs:Vec<OpenLibraryDoc> }
#[derive(Deserialize)] struct OpenLibraryDoc { title:String, subtitle:Option<String>, #[serde(default)] author_name:Vec<String>, #[serde(default)] publisher:Vec<String>, first_publish_year:Option<i32>, number_of_pages_median:Option<i32>, cover_i:Option<i64>, #[serde(default)] isbn:Vec<String> }
pub async fn lookup_isbn(raw:&str)->AppResult<MetadataResult>{
  let isbn:String=raw.chars().filter(|c|c.is_ascii_digit()||*c=='X').collect();if isbn.len()!=10&&isbn.len()!=13{return Err(AppError::InvalidIsbn)}
  let url=format!("https://openlibrary.org/search.json?isbn={isbn}&limit=1&fields=title,subtitle,author_name,publisher,first_publish_year,number_of_pages_median,cover_i,isbn");
  let response=reqwest::get(url).await.map_err(|_|AppError::MetadataUnavailable)?.error_for_status().map_err(|_|AppError::MetadataUnavailable)?.json::<OpenLibraryResponse>().await.map_err(|_|AppError::MetadataUnavailable)?;let d=response.docs.into_iter().next().ok_or(AppError::MetadataUnavailable)?;
  let isbn10=d.isbn.iter().find(|x|x.len()==10).cloned();let isbn13=d.isbn.iter().find(|x|x.len()==13).cloned();Ok(MetadataResult{title:d.title,subtitle:d.subtitle,authors:d.author_name,publisher:d.publisher.first().cloned(),publication_year:d.first_publish_year,page_count:d.number_of_pages_median,cover_url:d.cover_i.map(|id|format!("https://covers.openlibrary.org/b/id/{id}-L.jpg")),isbn10,isbn13,description:None})
}
