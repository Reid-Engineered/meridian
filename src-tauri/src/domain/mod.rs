use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BookInput {
    pub title: String, pub subtitle: Option<String>, pub authors: Vec<String>, pub description: Option<String>,
    pub publication_year: Option<i32>, pub series: Option<String>, pub series_position: Option<f64>,
    pub isbn10: Option<String>, pub isbn13: Option<String>, pub publisher: Option<String>, pub page_count: Option<i32>,
    pub language: Option<String>, pub format: String, pub status: String, pub current_page: Option<i32>, pub rating: Option<i32>,
    pub cover_url: Option<String>, pub tags: Vec<String>, pub collection_ids: Vec<i64>, pub location: Option<String>,
    pub condition: Option<String>, pub notes: Option<String>, pub review: Option<String>, pub date_acquired: Option<String>,
    pub date_started: Option<String>, pub date_finished: Option<String>
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BookDetail {
    pub id: i64, pub title: String, pub subtitle: Option<String>, pub authors: Vec<String>, pub description: Option<String>,
    pub publication_year: Option<i32>, pub series: Option<String>, pub series_position: Option<f64>, pub isbn10: Option<String>,
    pub isbn13: Option<String>, pub publisher: Option<String>, pub page_count: Option<i32>, pub language: Option<String>,
    pub format: String, pub status: String, pub current_page: Option<i32>, pub rating: Option<i32>, pub cover_url: Option<String>,
    pub tags: Vec<String>, pub collection_ids: Vec<i64>, pub location: Option<String>, pub condition: Option<String>,
    pub notes: Option<String>, pub review: Option<String>, pub date_acquired: Option<String>, pub date_started: Option<String>,
    pub date_finished: Option<String>, pub date_added: String
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BookQuery { pub search: Option<String>, pub status: Option<String>, pub format: Option<String>, pub min_rating: Option<i32>, pub collection_id: Option<i64>, pub sort: Option<String> }

#[derive(Debug, Serialize)] #[serde(rename_all = "camelCase")]
pub struct Collection { pub id:i64, pub name:String, pub description:Option<String>, pub book_count:i64, pub covers:Vec<String> }
#[derive(Debug, Serialize)] pub struct CountItem { pub label:String, pub value:i64 }
#[derive(Debug, Serialize)] #[serde(rename_all="camelCase")]
pub struct Statistics { pub total_books:i64,pub finished:i64,pub reading:i64,pub unread:i64,pub added_this_year:i64,pub finished_this_year:i64,pub pages_read:i64,pub average_rating:Option<f64>,pub top_authors:Vec<CountItem>,pub status_counts:Vec<CountItem>,pub format_counts:Vec<CountItem>,pub activity:Vec<CountItem> }
#[derive(Debug, Serialize)] #[serde(rename_all="camelCase")]
pub struct AppInfo { pub database_path:String,pub covers_path:String,pub version:String }
#[derive(Debug, Serialize, Deserialize)] #[serde(rename_all="camelCase")]
pub struct MetadataResult { pub title:String,pub subtitle:Option<String>,pub authors:Vec<String>,pub publisher:Option<String>,pub publication_year:Option<i32>,pub page_count:Option<i32>,pub cover_url:Option<String>,pub isbn10:Option<String>,pub isbn13:Option<String>,pub description:Option<String> }
