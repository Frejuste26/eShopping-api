import App from "./App/app.js";

const server = new App();
server.Launch().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});