# Bookmark Zen - Development Roadmap

## ✅ Completed (v0.1 - v0.2.2)
- [x] **Core Architecture**: Node.js + Express + React + PostgreSQL.
- [x] **Deployment**: Dockerfile for Railway (Playwright support).
- [x] **Analysis Engine**: Playwright scraping for Titles/Descriptions.
- [x] **Authentication**: Secure Register/Login (bcrypt + JWT + HttpOnly Cookies).
- [x] **UI**: Glassmorphism Theme & Weeping Willow Animation.
- [x] **Save Logic**: Authenticated users automatically save uploads to `user_bookmarks`.
- [x] **Dashboard**: Auto-loads saved bookmarks on login.

## 🚀 Priority Candidates (v0.3)
These are the features we are considering for the next major release:

- [ ] **Recursive Clustering ("The Organizer")**
    -   Use AI/LLM to dynamically break down large static categories.
    -   *Example*: "Recipes" -> "Vegan", "Dessert", "Quick Meals".
- [ ] **Instant Search & Filter ("The Finder")**
    -   Real-time search bar for Title, Domain, and Keywords.
    -   Essential for managing large libraries (1000+ links).
- [ ] **High-Res Favicons ("The Visual Upgrade")**
    -   Robust favicon fetcher service to populate the grid with high-quality icons.
    -   Makes the dashboard feel like a premium app.
- [ ] **User Management ("The Manager")**
    -   CRUD operations for Folders.
    -   Drag-and-drop organization.
    -   Rename/Delete support for individual bookmarks.

## 🔮 Future Concepts (v0.4+)
- [ ] **Smart Tagging**: Extract key terms from page content.
- [ ] **Import/Export**: JSON or HTML export of personal library.
- [ ] **Browser Extension**: Save to Zen directly from the browser toolbar.
