// Packaged Windows releases are GUI applications; retain console diagnostics in development.
#![cfg_attr(all(windows, not(debug_assertions)), windows_subsystem = "windows")]

fn main(){meridian_lib::run()}
