# SortWise - AI Waste Detection Website

SortWise is a web application that helps users categorize their waste into proper bins using AI. This project has been refactored to use a secure Node.js backend to prevent exposing the Gemini API key in the frontend.

## Project Structure

- `server.js`: The Express.js backend proxy server.
- `.env`: Environment variables file containing your backend secrets (e.g., Gemini API key). **Do not commit this file**.
- `js/api.js`: The frontend script that handles sending images to the local backend proxy.
- `index.html`, `UserDashboard.html` etc.: The primary HTML interfaces.
- `package.json`: Defines the backend dependencies.

## Setup Requirements

- [Node.js](https://nodejs.org/) (v16+)
- A Google Gemini API Key.

## Installation and Execution

1. **Install Dependencies**
   Navigate to the root directory `website/` and run:
   ```bash
   npm install
   ```

2. **Environment Configuration**
   In the root directory, create a `.env` file containing your Gemini API key:
   ```bash
   GEMINI_API_KEY=YOUR_ACTUAL_API_KEY
   ```

3. **Start the Backend Server**
   ```bash
   npm start
   ```
   The server will run on `http://localhost:3000`.

4. **Run the Frontend application**
   You can serve the application directory via a live server (like VS Code Live Server extension) or an http-server:
   ```bash
   npx http-server .
   ```
   Then open the provided local URL (e.g., `http://127.0.0.1:8080`) in your browser.

## How It Works end-to-end
1. The user uploads an image on the frontend (`UserDashboard.html`).
2. The frontend script (`js/api.js`) converts the image to base64.
3. The image is POSTed to the backend server endpoint (`http://localhost:3000/classify`).
4. The backend securely adds the API key and forwards the prompt + image to the Gemini AI API.
5. The response is mapped strictly to one of five categories (plastic, metal, paper, glass, organic) by the backend.
6. The frontend displays the resulting category and appropriately highlights the corresponding logical bin on screen.
