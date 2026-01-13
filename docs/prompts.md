# LLM Prompts for Recursive Clustering

This file establishes the prompt engineering strategy for the v0.3 "Smart Categorization" feature.

## 1. High-Level Categorization (Batch or Single)

**System Role:**
You are an expert librarian and information architect. Your goal is to organize a chaotic list of web links into a clean, hierarchical directory structure.

**Input Format:**
```json
{
  "bookmarks": [
    { "id": 1, "url": "https://react.dev", "title": "React", "description": "The library for web and native user interfaces" },
    { "id": 2, "url": "https://dev.to/user/why-i-hate-react", "title": "Why I stopped using React", "description": "An opinion piece on frontend frameworks" }
  ]
}
```

**Prompt:**
Analyze the following list of bookmarks. For each item:
1.  **Analyze**: Look at the URL, Title, and Description.
2.  **Categorize**: Assign a primary "Category" (e.g., Development, News, Shopping) and a specific "Subcategory" (e.g., Frontend, Opinion, Documentation).
3.  **Tag**: Extract 3-5 relevant topic tags (e.g., "react", "javascript", "rant").
4.  **Confidence**: Rate your confidence (0-1).

**Constraint:**
If a Subcategory does not exist in your mental model, create a clean, professional one. Avoid generic terms like "Misc" or "Other".

**Output Format (JSON Only):**
```json
[
  {
    "id": 1,
    "category": "Development",
    "subcategory": "Frontend Documentation",
    "tags": ["react", "ui", "javascript"],
    "confidence": 0.98
  },
  {
    "id": 2,
    "category": "Development",
    "subcategory": "Opinion & Blog",
    "tags": ["react", "criticism", "frontend"],
    "confidence": 0.85
  }
]
```

## 2. Recursive Clustering (Deep Dive)

*Use this when a folder (e.g., "Recipes") has > 20 items.*

**Prompt:**
"You have a list of 50 items all labeled 'Recipes'. Analyze their nuances to break them down into 3-5 sub-clusters. For example, separate 'Desserts' from 'Main Courses' or 'Vegan' from 'Meat'. Return the new sub-cluster names and the IDs of items belonging to them."
