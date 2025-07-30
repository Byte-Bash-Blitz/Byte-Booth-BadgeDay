# Byte Bash Blitz Photo Booth Platform

A celebration-themed web app for uploading and viewing event photos from the 3rd Badge Day celebration. Built with Vite + React, Firebase, and Cloudflare R2.

## 🎉 Features

### Current Features ✅
- **Colorful celebration-themed UI** with gradients and animations
- **Photo upload via drag & drop** or file picker
- **Camera capture** for live photo taking (requires camera permissions)
- **Photo gallery** with grid/list view options
- **Responsive design** that works on mobile and desktop
- **Event branding** for Byte Bash Blitz community

### Coming Soon 🚧
- **Cloudflare R2 integration** for scalable photo storage
- **Firebase Firestore** for photo metadata and user management
- **Real-time photo updates** across users
- **Like/favorite** photos functionality
- **Photo filtering** and search capabilities

## 🚀 Tech Stack

- **Frontend**: React 19 + Vite
- **Styling**: TailwindCSS with custom celebration theme
- **Storage**: Cloudflare R2 (object storage)
- **Database**: Firebase Firestore
- **File Upload**: react-dropzone + native camera API
- **Icons**: Lucide React

## 📦 Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables** (optional for development):
   ```bash
   cp .env.example .env
   # Edit .env with your actual credentials
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser** to http://localhost:5174

## 🎨 Event Theme

The app is designed specifically for **Byte Bash Blitz - 3rd Badge Day**, celebrating:
- Rookie to Basher transitions
- Community achievements and recognitions  
- Challenge winners and top performers
- Community app launch reveal
- Leaderboard updates and milestones

## 🛠️ Configuration

### Cloudflare R2 Setup
1. Create a Cloudflare R2 bucket
2. Generate API tokens with R2 permissions
3. Add credentials to `.env` file
4. Update bucket name in configuration

### Firebase Setup (Optional)
1. Create a Firebase project
2. Enable Firestore database
3. Add web app configuration to `.env`
4. Update Firebase config in `src/lib/firebase.js`

## 📱 Usage

### For Event Attendees
1. Visit the photo booth platform
2. Upload photos from the event using:
   - **Camera**: Take live photos with device camera
   - **Upload**: Choose photos from device gallery
   - **Drag & Drop**: Drag images directly onto upload area
3. View all community photos in the gallery
4. Download and share your favorite moments

### For Event Organizers
1. Share the platform URL with attendees
2. Monitor photo uploads in real-time
3. Moderate content if needed
4. Export photos for event archives

## 🌟 Development Notes

- **Mock data** is used when R2/Firebase aren't configured
- **Camera permissions** required for photo capture feature
- **File size limits** can be configured in upload components
- **Responsive design** optimized for mobile photo sharing

## 🚀 Deployment

Ready for deployment to **terminal.bytebashblitz.org** or any static hosting service:

```bash
npm run build
```

Built files will be in the `dist/` directory.

## 📄 License

Built for the Byte Bash Blitz community event 2025.
