import './globals.css';

export const metadata = {
  title: 'Shopify Message Templates',
  description: 'Browse, search and copy ready-made message templates for any situation.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}

        {/* DevNest Copyright Footer */}
        <footer className="devnest-footer">
          <div className="devnest-container">
            <span>&copy; {new Date().getFullYear()} <span className="devnest-team">Shopify - DevNest</span></span>
            <span>Developed by <a href="https://shakildev.online" target="_blank" rel="noopener noreferrer" className="devnest-author">Md Shakil Sarkar</a></span>
          </div>
        </footer>
      </body>
    </html>
  );
}
