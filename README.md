# NagarSeva - Crowdsourced Civic Issue Resolution System

> A mobile-first platform designed to empower citizens and streamline municipal operations by bridging the gap between reporting and resolving local civic issues.

Built for the Government of Jharkhand Hackathon under the "Clean & Green Technology" theme.

---

## ✨ Core Features (MVP)

### 👨‍👩‍👧 For Citizens (PWA)
* **Verified Authentication:** Secure sign-up and login for citizens.
* **Report an Issue:** Easily submit a civic issue with a photo, auto-captured GPS location, and a description.
* **Track Status:** View a list of submitted reports and track their status in real-time (`Submitted` -> `In Progress` -> `Resolved`).
* **Push Notifications:** Receive updates on your report's progress.

### 👮 For Admins (Web Portal)
* **Centralized Dashboard:** View, filter, and sort all incoming reports.
* **Live Issue Map:** Visualize all reported issues on an interactive map using Leaflet.js.
* **Status Management:** Update the status of reports as they are addressed.
* **Department Allocation:** Assign reports to the correct municipal department (e.g., Sanitation, Public Works).

## 💻 Tech Stack

| Area      | Technology                                           |
| --------- | ---------------------------------------------------- |
| **Frontend** | React (Vite), React Native, Tailwind CSS, Leaflet.js             |
| **Backend** | Node.js, Express.js                                  |
| **Database** | PostgreSQL + PostGIS for geospatial queries          |
| **Services** | Cloudinary (Image Hosting), Firebase (Notifications) |
| **Deployment**| Vercel (Client), Railway/Render (Server + DB)        |

---

## 🚀 Getting Started

Follow these instructions to get the project running locally for development and testing.

### Prerequisites

You must have the following installed on your machine:
* [Node.js](https://nodejs.org/) (v18 or higher)
* `npm` or `yarn`
* [PostgreSQL](https://www.postgresql.org/download/) (with the PostGIS extension enabled)

### Local Setup

**1. Clone the repository:**
```bash
git clone [YOUR_REPOSITORY_URL]
cd [PROJECT_FOLDER]
```

**2. Setup the Backend Server:**
```bash
# Navigate to the server directory
cd server

# Install dependencies
npm install

# Create the environment file
cp .env.example .env
```
Now, open the `.env` file and add your PostgreSQL database URL and other secrets.
```env
# server/.env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
PORT=3001
JWT_SECRET="your-super-secret-key"
```
Finally, run the database migrations and start the server:
```bash
# Optional: Add a migration script command to your package.json
# npm run db:migrate 

npm run dev
```
The server should now be running on `http://localhost:3001`.

**3. Setup the Frontend Client:**
```bash
# Navigate to the client directory from the root
cd client

# Install dependencies
npm install

# Create the environment file
cp .env.example .env
```
Open the `.env` file to add the backend API URL.
```env
# client/.env
VITE_API_BASE_URL="http://localhost:3001"
```
Start the React development server:
```bash
npm run dev
```
The client should now be running on `http://localhost:5173` (or another port if 5173 is busy).

---
## 📁 Project Structure

This project is a monorepo containing both the client and server code.

```
/
├── client/         # React Frontend (Citizen PWA + Admin Portal)
└── server/         # Node.js Backend (Express API)
```