# 🤖 AI Chatbot Widget

An embeddable AI-powered chatbot widget that you can integrate into **any website** — built with Node.js, Express, and the OpenAI API.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-green.svg)
![License](https://img.shields.io/badge/license-MIT-brightgreen.svg)

---

## ✨ Features

- 💬 **AI-Powered Chat** — Powered by OpenAI GPT for intelligent conversations
- 📄 **PDF Support** — Parse and reference PDF documents in responses
- 🗄️ **SQLite Database** — Persistent chat history with `better-sqlite3`
- 📧 **Email Notifications** — Built-in email support via Nodemailer
- 🔌 **Easy Embedding** — Drop a single `<script>` tag into any website
- 🛠️ **Admin Panel** — Manage chatbot settings and conversations
- 🌐 **Multi-Platform** — Works with HTML, PHP, Laravel, WordPress, and more
- 🔒 **CORS Enabled** — Secure cross-origin requests

---

## 📁 Project Structure

```
ai-chatbot-widget/
├── server/
│   ├── server.js        # Express backend server
│   ├── config.json      # Server configuration
│   └── chatbot.db       # SQLite database (auto-generated)
├── widget/
│   └── chatbot.js       # Embeddable chatbot widget script
├── admin/
│   └── index.html       # Admin dashboard
├── examples/
│   ├── html-example.html          # Plain HTML integration
│   ├── php-example.php            # PHP integration
│   ├── laravel-example.blade.php  # Laravel integration
│   └── wordpress-snippet.php      # WordPress integration
├── .env                 # Environment variables (not committed)
├── .gitignore
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v14 or higher
- An [OpenAI API Key](https://platform.openai.com/api-keys)

### 1. Clone the Repository

```bash
git clone https://github.com/ShivaratriManikanth/AIChat.git
cd AIChat
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# OpenAI API Key - Get yours from https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here

# Server Port
PORT=4000
```

### 4. Start the Server

```bash
npm start
```

The server will run at `http://localhost:4000`

---

## 🔌 Embedding the Widget

Add the following snippet to any HTML page:

```html
<script>
  window.chatbotConfig = {
    serverUrl: 'http://localhost:4000'
  };
</script>
<script src="http://localhost:4000/widget/chatbot.js"></script>
```

See the [`examples/`](./examples) folder for platform-specific integration guides:
- **HTML** → `html-example.html`
- **PHP** → `php-example.php`
- **Laravel** → `laravel-example.blade.php`
- **WordPress** → `wordpress-snippet.php`

---

## 🛠️ Admin Panel

Access the admin dashboard at:

```
http://localhost:4000/admin
```

Use the admin panel to:
- View chat conversations
- Configure chatbot behavior
- Manage settings

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| AI | OpenAI GPT API |
| Database | SQLite (better-sqlite3) |
| Email | Nodemailer |
| PDF Parsing | pdf-parse |
| Frontend Widget | Vanilla JavaScript |

---

## 🔐 Security Notes

- **Never commit your `.env` file** — it's already listed in `.gitignore`
- Keep your `OPENAI_API_KEY` private to avoid unauthorized usage and charges
- Use environment variables in production deployments

---

## 📦 Dependencies

```json
{
  "better-sqlite3": "^9.4.3",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "express": "^4.18.2",
  "nodemailer": "^8.0.5",
  "openai": "^4.24.1",
  "pdf-parse": "^1.1.1"
}
```

---

## 🤝 Contributing

Contributions are welcome! Feel free to:
1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👤 Author

**ShivaratriManikanth**  
GitHub: [@ShivaratriManikanth](https://github.com/ShivaratriManikanth)

---

> ⭐ If you found this project helpful, please give it a star on GitHub!
