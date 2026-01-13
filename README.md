# Bookmark Zen 🎋

**Organize your digital chaos.**

Bookmark Zen is a modern, privacy-focused bookmark manager that replaces your messy browser folders with a serene, organized dashboard. Just upload your bookmarks file, and let our AI agents analyze, categorize, and clean up your collection.

![Screenshot](https://via.placeholder.com/800x400?text=App+Screenshot+Placeholder)

## 🌟 Features
- **Instant Upload**: Drag & drop your Netscape HTML bookmark file (from Chrome, Firefox, Edge).
- **Auto-Analysis**: Uses **Playwright** to visit every link, extracting real titles, descriptions, and metadata.
- **Privacy First**: Self-hostable, with secure **bcrypt** authentication and **HTTP-only** sessions.
- **Glassmorphism UI**: A beautiful, calming interface with dynamic animations (Weeping Willow).
- **PostgreSQL**: Robust data persistence for global and user-specific links.

## 🛠️ Tech Stack
- **Frontend**: React, Vite, Framer Motion (Glassmorphism CSS).
- **Backend**: Node.js, Express.
- **Database**: PostgreSQL (with `pg` driver).
- **Scraper**: Playwright (Headless Chromium) + Cheerio.
- **Deployment**: Design for **Railway** (Dockerfile included).

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- PostgreSQL
- Docker (optional)

### Installation
1.  **Clone the repo**
    ```bash
    git clone https://github.com/yourusername/bookmark-zen.git
    cd bookmark-zen
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    npm install --prefix client
    npm install --prefix server
    ```

3.  **Environment Setup**
    Create a `.env` file in `server/` (or root):
    ```env
    PORT=3001
    DATABASE_URL=postgres://user:pass@localhost:5432/bookmark_zen
    JWT_SECRET=your_super_secret_key
    ```

4.  **Run Locally**
    ```bash
    # Start Backend
    cd server && npm start
    
    # Start Frontend (in new terminal)
    cd client && npm run dev
    ```

## 🐳 Docker Deployment
We include a `Dockerfile` optimized for **Railway** that installs all Playwright system dependencies.

```bash
docker build -t bookmark-zen .
docker run -p 8080:8080 -e PORT=8080 bookmark-zen
```

## 🤝 Contributing
See `docs/todo.md` for our roadmap!
1. Fork it
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---
*Built with ❤️ by Antigravity*
