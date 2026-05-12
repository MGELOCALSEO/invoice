# InvoiceOS - Invoice Management System

A complete invoice management system built with React that allows you to create, manage, and track invoices for your business.

## Features

- 📊 Dashboard with revenue statistics
- 📄 Create and manage invoices
- 👥 Client management
- ⚙️ Company settings and bank details
- 🖨️ Print functionality
- 💾 Local data persistence
- 📱 Responsive design

## Local Development

### Option 1: Using Python Server (Recommended for quick setup)

1. Clone this repository
2. Navigate to the project directory
3. Start the Python server:
   ```bash
   python3 -m http.server 3000
   ```
4. Open `http://localhost:3000` in your browser

### Option 2: Using React Development Server

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm start
   ```
3. Open `http://localhost:3000` in your browser

## Deployment

### Deploy to Vercel

1. Push this code to GitHub
2. Connect your GitHub repository to Vercel
3. Vercel will automatically detect it's a React app and deploy it

### Manual Deployment to Vercel

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```
2. Deploy:
   ```bash
   vercel --prod
   ```

## Data Storage

The application uses browser's localStorage to store:
- Company settings
- Client information
- Invoice data
- Application preferences

All data is stored locally in the browser and persists between sessions.

## Technologies Used

- React 18
- HTML5/CSS3
- JavaScript (ES6+)
- LocalStorage API
- Google Fonts

## License

MIT License - feel free to use this for personal or commercial projects.
