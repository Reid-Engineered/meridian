export type ReadingStatus = "Want to Read" | "Unread" | "Reading" | "Finished" | "Did Not Finish";
export type BookFormat = "Hardcover" | "Paperback" | "Mass Market Paperback" | "Ebook" | "Audiobook" | "Other";

export interface BookSummary {
  id: number;
  title: string;
  subtitle?: string | null;
  authors: string[];
  publicationYear?: number | null;
  format: BookFormat;
  status: ReadingStatus;
  rating?: number | null;
  coverUrl?: string | null;
  tags: string[];
  collectionIds: number[];
  dateAdded: string;
  currentPage?: number | null;
  pageCount?: number | null;
}

export interface BookDetail extends BookSummary {
  description?: string | null;
  series?: string | null;
  seriesPosition?: number | null;
  isbn10?: string | null;
  isbn13?: string | null;
  publisher?: string | null;
  language?: string | null;
  location?: string | null;
  condition?: string | null;
  notes?: string | null;
  review?: string | null;
  dateAcquired?: string | null;
  dateStarted?: string | null;
  dateFinished?: string | null;
}

export interface BookInput {
  title: string;
  subtitle?: string;
  authors: string[];
  description?: string;
  publicationYear?: number;
  series?: string;
  seriesPosition?: number;
  isbn10?: string;
  isbn13?: string;
  publisher?: string;
  pageCount?: number;
  language?: string;
  format: BookFormat;
  status: ReadingStatus;
  currentPage?: number;
  rating?: number;
  coverUrl?: string;
  tags: string[];
  collectionIds: number[];
  location?: string;
  condition?: string;
  notes?: string;
  review?: string;
  dateAcquired?: string;
  dateStarted?: string;
  dateFinished?: string;
}

export interface Collection { id: number; name: string; description?: string | null; bookCount: number; covers: string[]; }
export interface Statistics {
  totalBooks: number; finished: number; reading: number; unread: number; addedThisYear: number;
  finishedThisYear: number; pagesRead: number; averageRating: number | null;
  topAuthors: { label: string; value: number }[]; statusCounts: { label: string; value: number }[];
  formatCounts: { label: string; value: number }[]; activity: { label: string; value: number }[];
}
export interface AppInfo { databasePath: string; coversPath: string; version: string; }
export interface BookQuery { search?: string; status?: string; format?: string; minRating?: number; collectionId?: number; sort?: string; }
export interface MetadataResult { title: string; subtitle?: string; authors: string[]; publisher?: string; publicationYear?: number; pageCount?: number; coverUrl?: string; isbn10?: string; isbn13?: string; description?: string; }

export const EMPTY_BOOK: BookInput = {
  title: "", authors: [], format: "Paperback", status: "Unread", tags: [], collectionIds: []
};
