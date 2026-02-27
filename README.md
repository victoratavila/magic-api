# 🃏 Magic API

A simple REST API to manage a personal **Magic: The Gathering card collection and decks**.

This project was created to solve a real problem: keeping track of which cards are already owned and which ones are still missing when building a 100-card deck.

The API allows you to create cards, organize them into decks, and filter by ownership status.

It also integrates with the **Scryfall API** to automatically fetch card images.

---

# 🚀 Tech Stack

## Backend

- TypeScript
- Node.js
- Express
- Prisma ORM
- PostgreSQL

## Infrastructure

- Docker
- Docker Compose
- VPS-ready setup

## External API

- Scryfall API

---

# 📂 Project Structure

```text
magic-api/
│
├── prisma/              # Prisma schema and migrations
│
├── src/
│   ├── controllers/    # Route logic
│   ├── repositories/   # Database access
│   ├── routes/         # Express routes
│   ├── services/       # Business logic
│   └── app.ts          # Application entry point
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── Dockerfile
├── package.json
└── tsconfig.json
```

# ⚙️ Features

- Create cards
- Automatically fetch card image from Scryfall
- List cards
- Filter cards by ownership
- Organize cards into decks
- PostgreSQL database with Prisma
- Docker support

---

# 🧪 Environment Variables

Create a `.env` file:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/magic"
PORT=8080
```

---

# 🐳 Running with Docker (Recommended)

Start containers:

```bash
docker compose up -d
```

Run migrations:

```bash
docker compose exec api npx prisma migrate dev
```

---

# 💻 Running Locally (Without Docker)

Install dependencies:

```bash
npm install
```

Run migrations:

```bash
npx prisma migrate dev
```

Start server:

```bash
npm run dev
```

---

# 🌐 API Base URL

```text
http://localhost:8080
```

---

# 📌 Example Endpoint

## Create Card

**POST**

```text
/cards
```

**Body:**

```json
{
  "name": "Sol Ring",
  "set": "Commander Masters",
  "own": true
}
```

The API automatically fetches the card image from Scryfall.

---

# 🧠 Learning Goals

This project was created to practice:

- REST API design
- Prisma and PostgreSQL
- Docker
- Backend architecture
- External API integration
- Production-ready deployment

---

# 📦 Deployment

This project includes:

- Dockerfile
- docker-compose.prod.yml

Ready for VPS deployment.

---

# 👨‍💻 Author

**Victor Atavila**

GitHub:  
https://github.com/victoratavila

---

# ⭐ Future Improvements

- Authentication
- User system
- Deck improvements
- Pagination
- Automated tests
- Frontend integration
