<div align="center">
  <h1>🌱 SortWise</h1>
  <p><strong>Intelligent Household Waste Management & AI Classification System</strong></p>

  <p>
    <img src="https://img.shields.io/badge/status-active-success.svg" alt="Status" />
    <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version" />
    <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License" />
  </p>
</div>

---

## 📖 Overview

**SortWise** is a modern, responsive web platform designed to streamline municipal waste management. By bridging the gap between households and city administration, SortWise encourages sustainable sorting habits through real-time feedback, gamification, and AI-powered waste classification.

SortWise removes the guesswork from recycling by letting users simply point their camera at an item to know exactly which bin it belongs in, while providing administrators with interactive heatmaps to monitor city-wide sustainability efforts.

---

## ✨ Features

- **🤖 AI Waste Identifier:** Instantly classify waste (plastic, metal, paper, glass, organic) using device cameras and the Gemini Vision API.
- **📊 User Dashboard:** Track daily recycling habits, earn points for correct sorting, and view personalized weekly sustainability charts.
- **🗺️ Admin Dashboard:** High-level municipality control panel featuring geographical heatmaps for waste accumulation and detailed household compliance tables.
- **🔐 Secure Authentication:** Robust, role-based access control (Admin vs. User) powered by Supabase, completely free of hidden automatic redirects.
- **📱 Mobile-First Design:** A fluid, fully responsive interface featuring modern card UIs, soft shadows, and clean typography.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, Vanilla CSS (Custom Design System), Vanilla JavaScript
- **Backend:** Node.js, Express.js (REST API Proxy)
- **Authentication & Database:** Supabase (PostgreSQL, Auth, RLS)
- **AI Integration:** Google Gemini 2.5 Flash Vision API
- **Maps:** Leaflet.js (Admin Heatmaps)

---

## 🚀 Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v16.x or higher)
- A Supabase Project (URL and Anon/Publishable Key)
- Google Gemini API Key

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/sortwise.git
cd sortwise
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory and add your Gemini API Key:
```env
PORT=10000
GEMINI_API_KEY=your_gemini_api_key_here
```
*(Note: Supabase keys are currently initialized client-side in `js/auth.js` for rapid prototyping.)*

### 4. Start the Server
```bash
npm start
```
The server will automatically detect the static frontend assets and serve the application at `http://localhost:10000`.

---

## 💻 Usage

1. **Access the Platform:** Open `http://localhost:10000` in your browser.
2. **User Portal:** Register a new household or log in. Navigate to the User Dashboard to view your sorting stats or use the AI Camera to identify waste.
3. **Admin Portal:** Log in with administrative credentials to access the global dashboard, inspect household accuracy tables, and view the waste accumulation heatmap.

---

## 📂 Project Structure

```text
├── css/
│   └── style.css          # Global styling and responsive UI rules
├── js/
│   ├── auth.js            # Supabase authentication and session logic
│   └── script.js          # DOM manipulation, charts, and AI camera interactions
├── server.js              # Express backend, static file serving, and Gemini API proxy
├── AdminDashboard.html    # Administrative overview and oversight tools
├── AdminLogin.html        # Secure admin portal access
├── Home.html / index.html # Landing page
├── UserDashboard.html     # Household tracking and AI camera
├── UserLogin.html         # User registration and login
└── package.json           # Node.js dependencies and scripts
```

---

## 📸 Screenshots

*(Replace these placeholders with actual screenshots of your application)*

| User Dashboard (AI Camera) | Admin Municipal Heatmap |
|:---:|:---:|
| `![User Dashboard](./images/demo-user.png)` | `![Admin Dashboard](./images/demo-admin.png)` |

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.
